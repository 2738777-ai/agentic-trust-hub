// 萬用插座・代理網站測試：官方執行程式＋真的網站動作＋腳本模型（不呼叫任何 AI 服務）。
// Run: node --test "tests/agent/*.test.mjs"
// The site is served over real HTTP on this machine (the official serve_site.mjs), so the
// checkers fetch the demo sites exactly as a browser would.
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";
import { ActionRegistry } from "../../runtime/actions.js";
import { AgentNetwork, validateNetwork } from "../../runtime/kernel.js";
import { buildToolTable, runAgent } from "../../runtime/runner.js";
import { TraceBus } from "../../runtime/trace.js";
import { ScriptedModel } from "./scripted_model.mjs";

const 根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NETWORK = "trust_hub";
const CALL_BUDGET = 16000;
const SERVE = process.env.SERVE_SITE ?? path.join(根, "tools", "serve_site.mjs");

let 伺服器, BASE;
const 空埠 = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });

before(async () => {
  const 埠 = await 空埠();
  伺服器 = spawn(process.execPath, [SERVE, 根, "--port", String(埠)], { stdio: ["ignore", "pipe", "pipe"] });
  BASE = `http://localhost:${埠}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${BASE}/agent-manifest.json`)).ok) break; } catch { /* 還沒起來 */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const m = await import("../../site-actions.js");
  m.useSiteBase(`${BASE}/`);
});
after(() => 伺服器?.kill());

const 載入 = async () => {
  const config = JSON.parse(await readFile(path.join(根, `${NETWORK}.network.json`), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(根, "agent-manifest.json"), "utf8"));
  return { config, manifest, network: new AgentNetwork(config, NETWORK) };
};
const 範圍 = () => ({ base: BASE, network: NETWORK });
const 登記 = async () => {
  const { registerActions } = await import("../../site-actions.js");
  const r = new ActionRegistry();
  await registerActions({ register: r.register.bind(r, 範圍()) });
  return r;
};
const 情境 = (載, 登, 模型) => ({
  network: 載.network, manifest: 載.manifest, actions: 登, baseOrigin: BASE, displayOrigin: new URL(BASE).host,
  trace: new TraceBus(), isTop: true, frontMan: 載.network.findFrontMan(), history: [], llm: 模型,
  confirmWebsiteActions: async () => true,
});
const 命令列 = (版本) => new Promise((ok) => {
  execFile(process.execPath, [path.join(根, "cli", "插座.mjs"), "檢查", path.join(根, "examples", 版本), "--en"], (e) => ok(e ? e.code : 0));
});
const 結束碼 = { GREEN: 0, YELLOW: 10, REVIEW: 20, DENY: 30 };

test("T1：雙代理網路通過官方驗證，前台會叫內部代理 law_auditor", async () => {
  const 載 = await 載入();
  assert.deepEqual(validateNetwork(載.network).errors, []);
  assert.equal(載.network.findFrontMan(), "trust_hub_assistant");
  assert.equal(載.config.tools.length, 2);
  assert.equal(載.config.tools[0].tools[0], "law_auditor");
  // T4：另外兩個工具是第二個網域上的夥伴網路，而且都在 allowed_peers 裡
  const 夥伴 = 載.config.tools[0].tools.slice(1);
  assert.equal(夥伴.length, 2);
  for (const u of 夥伴) {
    assert.notEqual(new URL(u).origin, "https://2738777-ai.github.io");
    assert.ok(載.manifest.allowed_peers.includes(new URL(u).origin), u);
  }
  assert.equal(載.manifest.networks[0].name, NETWORK);
  assert.notEqual(載.manifest.llm_router.mock, true);
});

test("動作：三個動作都註冊成本站專用（local-only），清單和程式一致", async () => {
  const 載 = await 載入();
  const 登 = await 登記();
  const 名們 = 登.catalog(範圍()).map((e) => e.name).sort();
  assert.deepEqual(名們, [...載.manifest.actions.agentTools].sort());
  for (const e of 登.catalog(範圍())) {
    assert.equal(e.availability ?? "local-only", "local-only", e.name);
    assert.equal(e.effect, "read", `${e.name} 只准判斷、不准動手`);
  }
});

test("示範網站清單和 examples/目錄.json 一致", async () => {
  const { DEMO_SITES } = await import("../../site-actions.js");
  const 目錄 = JSON.parse(await readFile(path.join(根, "examples", "目錄.json"), "utf8"));
  const 代理網站 = 目錄.filter((v) => v.網路).map((v) => v.名);
  assert.deepEqual([...DEMO_SITES].sort(), [...代理網站].sort());
});

test("同一份引擎：助手對五個示範網站的決定，和命令列一模一樣", async () => {
  const { TrustHubActions, DEMO_SITES } = await import("../../site-actions.js");
  const 期待 = { A_normal: "GREEN", B_injected: "DENY", C_self_signed: "DENY", D_steps_changed: "DENY", E_unsigned: "YELLOW" };
  for (const 版本 of DEMO_SITES) {
    const r = await TrustHubActions.checkDemo({ site: 版本 });
    assert.equal(r.ok, true);
    assert.equal(r.decision, 期待[版本], `${版本}: ${JSON.stringify(r.reasons)}`);
    assert.equal(結束碼[r.decision], await 命令列(版本), `${版本} 助手和命令列判得不一樣`);
    for (const x of r.reasons) assert.ok(x.checker_said.length <= 400);
  }
  // C：簽章是真的（被騙），進門檢查抓到 → 最壞的贏
  const c = await TrustHubActions.checkDemo({ site: "C_self_signed" });
  assert.deepEqual(c.reasons.map((x) => [x.checker, x.level]), [["Agent Customs", "DENY"], ["NandaSeal", "GREEN"]]);
});

test("審查改法典：放鬆一定要人點頭，而且從來不會真的套用", async () => {
  const { TrustHubActions } = await import("../../site-actions.js");
  const 前 = await TrustHubActions.overview();
  const 鬆 = await TrustHubActions.compare({ find: "Agent Customs says DENIED → DENY", replace: "Agent Customs says DENIED → REVIEW" });
  assert.equal(鬆.ok, true);
  assert.equal(鬆.loosened, 3);
  assert.equal(鬆.needs_human_approval, true);
  assert.equal(鬆.applied, false);
  const 緊 = await TrustHubActions.compare({ find: "Agent Customs says CONDITIONS → YELLOW", replace: "Agent Customs says CONDITIONS → REVIEW" });
  assert.equal(緊.loosened, 0);
  assert.equal(緊.needs_human_approval, false);
  // 拔掉一個檢查工具＝少一道關卡＝放鬆
  const 法 = 前.law_lines.map((t) => t.replace(/^\d+: /, "")).filter((t) => !t.startsWith("NandaSeal")).join("\n");
  const 拔 = await TrustHubActions.compare({ new_law: 法 });
  assert.equal(拔.needs_human_approval, true);
  assert.ok(拔.loosened_examples.some((x) => x.reason === "a checker was removed"));
  // 改名騙比例：尺有任何改動一律要人看
  const 改尺 = await TrustHubActions.compare({ find: "scale: GREEN < YELLOW < REVIEW < DENY", replace: "scale: GREEN < YELLOW < REVIEW < ALLOW" });
  assert.equal(改尺.ok === false || 改尺.needs_human_approval === true, true);
  // 看不懂就停，不猜；找不到那一行就退回
  assert.equal((await TrustHubActions.compare({ find: "Agent Customs says CLEARED → GREEN", replace: "Agent Customs says CLEARED → SCARY" })).ok, false);
  assert.equal((await TrustHubActions.compare({ find: "no such line", replace: "x" })).ok, false);
  assert.equal((await TrustHubActions.compare({ find: "a", replace: "b", new_law: "c" })).ok, false);
  // 現行法典完全沒變
  assert.deepEqual((await TrustHubActions.overview()).law_lines, 前.law_lines);
});

test("T3：前台叫接地動作，再把改法典的問題交給內部代理 law_auditor；呼叫預算在範圍內", async (t) => {
  const 載 = await 載入();
  const 登 = await 登記();
  const 模型 = new ScriptedModel([
    { tool: "website_check_demo_site", arguments: { site: "C_self_signed" } },
    { tool: "law_auditor", arguments: { request: "Change 'Agent Customs says DENIED → DENY' to 'Agent Customs says DENIED → REVIEW'. Is it safe?" } },
    { tool: "website_compare_law_change", arguments: { find: "Agent Customs says DENIED → DENY", replace: "Agent Customs says DENIED → REVIEW" } },
    { text: "3 cells loosened; a human must approve." },
    { text: "C is DENY. The change loosens 3 cells and needs a human." },
  ]);
  const ctx = 情境(載, 登, 模型);
  const 結果 = await runAgent(ctx, ctx.frontMan, "Check C, then tell me if DENIED → REVIEW is safe.", null, []);
  assert.ok(模型.toolNames(0).includes("website_check_demo_site"));
  assert.ok(模型.toolNames(0).includes("law_auditor"));
  const 查 = 模型.toolResults(1)[0];
  assert.equal(查.status, "succeeded");
  assert.equal(查.result.decision, "DENY");
  // 第 3 次呼叫是 law_auditor 自己的模型呼叫：它只看到前台轉給它的 request
  const 審系統 = 模型.calls[2].messages[0].content;
  assert.match(審系統, /audit proposed changes/);
  const 比 = 模型.toolResults(3)[0];
  assert.equal(比.result.loosened, 3);
  assert.equal(比.result.applied, false);
  assert.match(結果.text, /needs a human/);
  for (const [i, 呼叫] of 模型.calls.entries()) {
    const 字數 = 呼叫.messages[0].content.length + JSON.stringify(呼叫.tools).length;
    t.diagnostic(`call ${i}: ${字數} characters`);
    assert.ok(字數 <= CALL_BUDGET, `call ${i} sends ${字數} characters`);
  }
});

test("T7：壞掉的網路在呼叫模型之前就被擋下來", async () => {
  const 載 = await 載入();
  const 壞 = structuredClone(載.config);
  壞.tools[0].tools = ["law_auditor", "no_such_agent"];
  const 錯們 = validateNetwork(new AgentNetwork(壞, NETWORK)).errors;
  assert.ok(錯們.length > 0, "引用不存在的代理要被擋");
});

test("發現：官方執行程式不擋重複的代理名（規格 3.1 要擋）→ 本站自己的網路先證明沒有重複", async () => {
  const 載 = await 載入();
  const 名們 = 載.config.tools.map((a) => a.name);
  assert.equal(new Set(名們).size, 名們.length);
  // 記錄現況：官方 validateNetwork 對重複名回 0 個錯誤。這是萬用插座可以替夥伴網站補的檢查。
  const 重複 = structuredClone(載.config);
  重複.tools.push(structuredClone(重複.tools[1]));
  const 錯 = validateNetwork(new AgentNetwork(重複, NETWORK)).errors;
  if (錯.length === 0) console.log("# 官方執行程式目前不擋重複代理名（已知缺口，萬用插座要替夥伴網站補）");
});
