// 萬用插座・跨站閘門測試（T4）：真的官方引擎（runtime/engine.js 的 resolveRemote）＋兩個不同的本機來源。
// 「我們的站」在 localhost，「別站」在 127.0.0.1（不同來源）。別站的五個示範版本照原樣提供；
// 另外有一個「掉包站」：第一次給好的網路，之後給壞的。
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";
import { Engine } from "../../runtime/engine.js";
import { 卡片答案, 安裝閘門 } from "../../trust-gate.js";

const 根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const 網 = "tidewhistle_guesthouse";
let 別站, 掉包站, 別站來源, 掉包來源;
const 請求紀錄 = [];

const 服務資料夾 = (處理) => new Promise((ok) => { const s = http.createServer(處理).listen(0, "127.0.0.1", () => ok(s)); });
const 回檔 = async (res, 檔) => {
  try { const t = await readFile(檔); res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); res.end(t); }
  catch { res.writeHead(404, { "Access-Control-Allow-Origin": "*" }); res.end(""); }
};

before(async () => {
  別站 = await 服務資料夾(async (req, res) => { 請求紀錄.push(req.url); await 回檔(res, path.join(根, decodeURIComponent(req.url.split("?")[0]))); });
  別站來源 = `http://127.0.0.1:${別站.address().port}`;
  const 次數 = new Map();
  掉包站 = await 服務資料夾(async (req, res) => {
    const p = req.url.split("?")[0];
    const n = (次數.get(p) ?? 0) + 1; 次數.set(p, n);
    // 網路檔：第一次給 A（正常），之後給 B（被塞壞指令）。描述檔和簽章都照 A。
    const 檔 = p.endsWith(`${網}.network.json`) && n >= 2 ? `examples/B_injected/${網}.network.json` : p.replace(/^\/swap\//, "examples/A_normal/");
    await 回檔(res, path.join(根, 檔));
  });
  掉包來源 = `http://127.0.0.1:${掉包站.address().port}`;
});
after(() => { 別站?.close(); 掉包站?.close(); });

// 真的官方引擎；我們的站在 localhost（和別站不同來源），只開放這兩個別站
async function 做引擎(回報們 = []) {
  const 我們 = "http://localhost:9";
  const e = new Engine({ originUrl: 我們 });
  e.top = { base: 我們, manifest: { networks: [{ name: "trust_hub" }], allowed_peers: [別站來源, 掉包來源] } };
  e.userRouter = { baseUrl: "browser://mock", mock: true, publisherFunded: false };
  e.actions.remoteLoads = new Map();          // 示範網站的網站動作要靠瀏覽器的橋接頁，Node 裡先當作已載入
  const 法典 = await readFile(path.join(根, "core", "法典.en.txt"), "utf8");
  const 核 = await import("../../web/核心包.js");
  const 原 = e.resolveRemote.bind(e);
  let 原被呼叫 = 0;
  e.resolveRemote = async (...a) => { 原被呼叫++; return 原(...a); };
  安裝閘門(e, { 載入核心: async () => 核, 讀法典: async () => 法典, pageOrigin: 我們, 回報: (x) => 回報們.push(x) });
  e.原被呼叫 = () => 原被呼叫;
  return e;
}
const 略過橋接 = (e, 來源, 版本) => e.actions.remoteLoads.set(`${來源}/examples/${版本}::${網}`, Promise.resolve());
const 網址 = (來源, 版本) => `${來源}/examples/${版本}/${網}`;

test("規矩 1：卡片只准三種答案，其他一律當拒絕", () => {
  assert.equal(卡片答案("allow"), "allow");
  assert.equal(卡片答案("always"), "always");
  assert.equal(卡片答案("decline"), "decline");
  for (const 怪 of [undefined, null, "", "deny", "Allow", "yes", true, 1]) assert.equal(卡片答案(怪), "decline", String(怪));
});

test("五個示範網站當別站：A 綠、E 黃放行；B、C、D 擋下，別站的網路沒有被執行程式抓、也不在快取", async () => {
  const 期待 = { A_normal: false, B_injected: true, C_self_signed: true, D_steps_changed: true, E_unsigned: false };
  for (const [版本, 該擋] of Object.entries(期待)) {
    const 回報們 = [];
    const e = await 做引擎(回報們);
    略過橋接(e, 別站來源, 版本);
    請求紀錄.length = 0;
    if (該擋) {
      await assert.rejects(e.resolveRemote(網址(別站來源, 版本), [], null), /Agentic Trust Hub blocked/, 版本);
      assert.equal(e.registry.cache.size, 0, `${版本} 不准留在快取`);
      assert.equal(回報們[0].擋下, true);
      assert.equal(e.原被呼叫(), 0, `${版本} 擋下時官方的 resolveRemote（會去抓、編譯、執行）一次都不該被叫到`);
      // 插座每個檔只抓一次（快照）；執行程式自己的抓取一次都沒發生
      const 網路請求 = 請求紀錄.filter((u) => u.includes(`${網}.network.json`));
      assert.equal(網路請求.length, 1, `${版本} 網路檔被抓了 ${網路請求.length} 次`);
    } else {
      const s = await e.resolveRemote(網址(別站來源, 版本), [], null);
      assert.equal(s.network.name, 網);
      assert.equal(回報們[0].擋下, false);
      assert.equal(回報們[0].查.決定, 版本 === "A_normal" ? "綠" : "黃");
    }
  }
});

test("規矩 6 掉包：檢查時給好的、執行時換壞的 → 擋下，不留快取", async () => {
  const 回報們 = [];
  const e = await 做引擎(回報們);
  e.actions.remoteLoads.set(`${掉包來源}/swap::${網}`, Promise.resolve());
  await assert.rejects(e.resolveRemote(`${掉包來源}/swap/${網}`, [], null), /bait-and-switch/);
  assert.equal(e.registry.cache.size, 0);
  assert.equal(回報們[0].原因, "掉包");
});

test("規矩 7：放行過的從快取再用（不重抓）；快取裡沒放行過的會被丟掉重查", async () => {
  const e = await 做引擎();
  略過橋接(e, 別站來源, "A_normal");
  const s1 = await e.resolveRemote(網址(別站來源, "A_normal"), [], null);
  請求紀錄.length = 0;
  const s2 = await e.resolveRemote(網址(別站來源, "A_normal"), [], null);
  assert.equal(s1, s2);
  assert.equal(請求紀錄.length, 0, "快取命中不該再聯絡別站");
  // 有人把沒檢查過的東西塞進快取（例如繞過閘門）→ 丟掉、重查、擋下
  const e2 = await 做引擎();
  e2.registry.set(`${別站來源}/examples/B_injected`, 網, { 假的: true });
  await assert.rejects(e2.resolveRemote(網址(別站來源, "B_injected"), [], null), /blocked/);
  assert.equal(e2.registry.cache.size, 0);
});

test("規矩 3：不在 allowed_peers 的來源，連碰都不碰", async () => {
  const 回報們 = [];
  const e = await 做引擎(回報們);
  e.top.manifest.allowed_peers = [];
  請求紀錄.length = 0;
  await assert.rejects(e.resolveRemote(網址(別站來源, "A_normal"), [], null), /Policy/);
  assert.equal(請求紀錄.length, 0);
  assert.equal(回報們.length, 0);
  assert.equal(e.原被呼叫(), 0, "官方的 resolveRemote 一次都不該被叫到");
});

test("規矩 8：閘門自己讀不到（別站壞掉、沒有那個網路名）一律擋下", async () => {
  const e = await 做引擎();
  await assert.rejects(e.resolveRemote(`${別站來源}/no_such_folder/${網}`, [], null), /could not check/);
  await assert.rejects(e.resolveRemote(`${別站來源}/examples/A_normal/other_name`, [], null), /could not check/);
  assert.equal(e.registry.cache.size, 0);
});

test("T7 循環：同一個別站網路在呼叫鏈裡出現兩次，聯絡前就停", async () => {
  const e = await 做引擎();
  請求紀錄.length = 0;
  const 鍵 = e.registry.cacheKey(`${別站來源}/examples/A_normal`, 網);
  await assert.rejects(e.resolveRemote(網址(別站來源, "A_normal"), [鍵], null), /cycle/);
  assert.equal(請求紀錄.length, 0);
});
