// 產生 worker/fixed-prompts.js：代付服務只替「這兩個代理、這一字不差的系統提示和工具定義」付錢。
// 用官方執行程式本身（和瀏覽器同一份 runtime/）實際組一次提示，不手抄，所以不會和網頁上送出的不一樣。
// （已核對：Node 裡組出來的，和真的 Chrome 送給模型的，系統提示和工具定義一字不差。）
//
// 用法：node tools/產生代付固定提示.mjs           重寫 worker/fixed-prompts.js
//       node tools/產生代付固定提示.mjs --check   只比對，不一樣就失敗（測試用）
// 改了 trust_hub.hocon、site-actions.js 的描述或 runtime/ 之後要重跑，不然代付服務會把新的提示當成外人擋掉。
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ActionRegistry } from "../runtime/actions.js";
import { AgentNetwork } from "../runtime/kernel.js";
import { runAgent } from "../runtime/runner.js";
import { TraceBus } from "../runtime/trace.js";
import { ScriptedModel } from "../tests/agent/scripted_model.mjs";

const 根 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const 輸出 = path.join(根, "worker", "fixed-prompts.js");

export async function 組出固定提示() {
  const config = JSON.parse(await readFile(path.join(根, "trust_hub.network.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(根, "agent-manifest.json"), "utf8"));
  const network = new AgentNetwork(config, "trust_hub");
  const BASE = "https://example.invalid";
  const { registerActions } = await import("../site-actions.js");
  const 登 = new ActionRegistry();
  await registerActions({ register: 登.register.bind(登, { base: BASE, network: "trust_hub" }) });
  // 前台叫一次內部代理，兩個代理各被問一次
  const 模型 = new ScriptedModel([{ tool: "law_auditor", arguments: { request: "x" } }, { text: "a" }, { text: "b" }]);
  const ctx = { network, manifest, actions: 登, baseOrigin: BASE, displayOrigin: "example.invalid", trace: new TraceBus(),
    isTop: true, frontMan: network.findFrontMan(), history: [], llm: 模型, confirmWebsiteActions: async () => true };
  await runAgent(ctx, ctx.frontMan, "hi", null, []);
  const 取 = (i, 名) => ({ 名, 系統提示: 模型.calls[i].messages[0].content, 工具們: 模型.calls[i].tools });
  return [取(0, "trust_hub_assistant"), 取(1, "law_auditor")];
}

const 寫成檔 = (代理們) => `// 自動產生，不要手改：node tools/產生代付固定提示.mjs
// 代付服務只替這兩個代理付錢；系統提示和工具定義由伺服器這一份為準，瀏覽器送來的一律換掉。
export const 固定代理們 = ${JSON.stringify(代理們, null, 1)};
`;

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const 新 = 寫成檔(await 組出固定提示());
  if (process.argv.includes("--check")) {
    const 舊 = await readFile(輸出, "utf8").catch(() => "");
    if (舊 !== 新) { console.error("worker/fixed-prompts.js 不是最新的：node tools/產生代付固定提示.mjs"); process.exit(1); }
    console.log("worker/fixed-prompts.js 是最新的");
  } else {
    await writeFile(輸出, 新);
    console.log("已寫入 worker/fixed-prompts.js");
  }
}
