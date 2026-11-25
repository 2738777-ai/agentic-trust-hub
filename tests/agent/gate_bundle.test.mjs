// 一行裝上的閘門（gate/trust-hub-gate.js）：就是要給別人的那一個產出檔，裝在真的官方引擎上測。
// 別站在 127.0.0.1（和「別人的網站」localhost 不同來源），提供五個示範版本。
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";
import { Engine } from "../../runtime/engine.js";
import * as 閘門 from "../../gate/trust-hub-gate.js";

const 根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const 網 = "tidewhistle_guesthouse";
let 別站, 別站來源;
const 請求紀錄 = [];

before(async () => {
  別站 = http.createServer(async (req, res) => {
    請求紀錄.push(req.url);
    try { const t = await readFile(path.join(根, decodeURIComponent(req.url.split("?")[0]))); res.writeHead(200, { "Access-Control-Allow-Origin": "*" }); res.end(t); }
    catch { res.writeHead(404); res.end(""); }
  });
  await new Promise((ok) => 別站.listen(0, "127.0.0.1", ok));
  別站來源 = `http://127.0.0.1:${別站.address().port}`;
});
after(() => 別站?.close());

function 別人的引擎() {
  const e = new Engine({ originUrl: "http://localhost:9" });
  e.top = { base: "http://localhost:9", manifest: { networks: [{ name: "their_site" }], allowed_peers: [別站來源] } };
  e.userRouter = { baseUrl: "browser://mock", mock: true, publisherFunded: false };
  e.actions.remoteLoads = new Map();
  for (const v of ["A_normal", "B_injected", "C_self_signed", "D_steps_changed", "E_unsigned"]) e.actions.remoteLoads.set(`${別站來源}/examples/${v}::${網}`, Promise.resolve());
  return e;
}
const 叫 = (e, 版本) => e.resolveRemote(`${別站來源}/examples/${版本}/${網}`, [], null);

test("產出檔是最新的（和原始碼一致）", () => {
  const 出 = execFileSync(process.execPath, [path.join(根, "tools", "打包閘門.mjs"), "--check"], { encoding: "utf8" });
  assert.match(出, /最新/);
});

test("一行裝上：預設法典下 A 綠、E 黃放行；B、C、D 擋下；回報是英文物件", async () => {
  const 報 = [];
  const e = 別人的引擎();
  assert.equal(閘門.install(e, { onReport: (x) => 報.push(x) }).version, 閘門.VERSION);
  await 叫(e, "A_normal");
  await 叫(e, "E_unsigned");
  for (const v of ["B_injected", "C_self_signed", "D_steps_changed"]) await assert.rejects(叫(e, v), /Agentic Trust Hub blocked/, v);
  assert.deepEqual(報.map((x) => [x.allowed, x.decision]), [[true, "GREEN"], [true, "YELLOW"], [false, "DENY"], [false, "DENY"], [false, "DENY"]]);
  const c = 報[3];
  assert.equal(c.reason, "law");
  assert.deepEqual(c.reasons.map((r) => [r.checker, r.code, r.level, r.lawLine]), [["Agent Customs", "DENIED", "DENY", 13], ["NandaSeal", "VERIFIED", "GREEN", 18]]);
  assert.equal(e.registry.cache.size, 2, "只有放行的兩個在快取");
});

test("用自己的法典：把「沒有簽章」改成 DENY，E 就被擋", async () => {
  const 法 = 閘門.DEFAULT_LAW.replace("NandaSeal says MISSING_FACTS → YELLOW", "NandaSeal says MISSING_FACTS → DENY");
  assert.notEqual(法, 閘門.DEFAULT_LAW);
  const e = 別人的引擎();
  閘門.install(e, { law: 法 });
  await assert.rejects(叫(e, "E_unsigned"), /blocked/);
  await 叫(e, "A_normal");
});

test("規矩 1：onConsent 不管是裝之前還是裝之後才設，奇怪的答案都當拒絕", async () => {
  const e = 別人的引擎();
  e.onConsent = async () => undefined;                  // 裝之前設
  閘門.install(e);
  assert.equal(await e.requestConsent({ peerOrigin: "http://x", peerLabel: "x" }), "decline");
  e.onConsent = async () => "deny";                     // 裝之後才設
  assert.equal(await e.requestConsent({ peerOrigin: "http://y", peerLabel: "y" }), "decline");
  e.onConsent = async () => "allow";
  assert.equal(await e.requestConsent({ peerOrigin: "http://z", peerLabel: "z" }), "allow");
});

test("規矩 8 出錯就關門：法典讀不懂、引擎不認得 → 安裝失敗，而且別站呼叫被關掉", async () => {
  const e = 別人的引擎();
  assert.throws(() => 閘門.install(e, { law: "Agent Customs says CLEARED → MAYBE" }));
  請求紀錄.length = 0;
  await assert.rejects(叫(e, "A_normal"), /not active/);
  assert.equal(請求紀錄.length, 0, "關門後連碰都不碰別站");
  const 怪 = { resolveRemote: async () => "跑了" };
  assert.throws(() => 閘門.install(怪), /does not recognise this runtime/);
  await assert.rejects(怪.resolveRemote(), /not active/);
});

test("規矩 9：私有資料按目的地點名", async () => {
  // 先拿到官方 Session 的原型（官方沒匯出），把 invoke 換成「只記錄收到什麼」
  const 探 = 別人的引擎();
  const 原型 = Object.getPrototypeOf(await 叫(探, "A_normal"));
  const 原 = 原型.invoke;
  let 收到;
  原型.invoke = async function (req) { 收到 = req.sly_data; return { text: "ok" }; };
  try {
    const 報 = [];
    const A網址 = `${別站來源}/examples/A_normal/${網}`;
    const e = 別人的引擎();
    閘門.install(e, { privateContext: { [A網址]: ["visitor_language"] }, onReport: (x) => 報.push(x) });
    const s = await 叫(e, "A_normal");
    await s.invoke({ user_message: { text: "x" }, sly_data: { visitor_language: "zh-TW", backend_token: "t" } }, {});
    assert.deepEqual(收到, { visitor_language: "zh-TW" });
    assert.deepEqual(報.at(-1).privateContextSent, ["visitor_language"]);
    // 沒點名的目的地：什麼都不送
    const e2 = 別人的引擎();
    閘門.install(e2);
    await (await 叫(e2, "E_unsigned")).invoke({ user_message: { text: "x" }, sly_data: { visitor_language: "zh-TW" } }, {});
    assert.deepEqual(收到, {});
  } finally { 原型.invoke = 原; }
});
