// 版本指紋（規矩見 tests/版本.mjs 開頭）：每個檔案算 SHA-256，再合成一個 12 字的總指紋。
//   網站 → version.json（GitHub Pages 會跟著網站一起上線）
//   代付服務 → worker/版本.js（Cloudflare 會跟著 Worker 一起部署；GET /health 回報它）
// 改了下面清單裡的任何一個檔案，都要重跑：node tools/產生版本指紋.mjs（測試會檢查有沒有忘記）。
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const 根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const 執行程式 = (await readdir(path.join(根, "runtime"))).filter((f) => /\.(m?js)$/.test(f)).sort().map((f) => `runtime/${f}`);

// 網站上真的會被瀏覽器載入、和安全有關的檔案
export const 網站檔們 = [
  "index.html", "site.js", "site-actions.js", "trust-gate.js",
  "gate/trust-hub-gate.js", "gate/入口.mjs", "gate/規矩表.mjs",
  "web/核心包.js", "core/法典.en.txt",
  "agent-manifest.json", "agent-mcp.json", "links.json", "trust_hub.network.json",
  ...執行程式,
];
// 代付服務部署的檔案（版本.js 自己不算，不然永遠算不完）
export const 代付檔們 = ["worker/worker.js", "worker/fixed-prompts.js", "worker/wrangler.toml"];

const sha = (b) => createHash("sha256").update(b).digest("hex");
export function 算指紋(檔們) {
  const 檔案 = Object.fromEntries(檔們.map(({ 路, 內容 }) => [路, sha(內容)]));
  const 總 = sha(Object.keys(檔案).sort().map((k) => `${k}\n${檔案[k]}\n`).join(""));
  return { 總指紋: 總.slice(0, 12), 檔案 };
}
const 讀們 = (路們) => Promise.all(路們.map(async (路) => ({ 路, 內容: await readFile(path.join(根, 路)) })));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const 網站 = 算指紋(await 讀們(網站檔們));
  await writeFile(path.join(根, "version.json"), JSON.stringify({ 說明: "萬用插座網站的版本指紋（tools/產生版本指紋.mjs 產生）。部署驗收頁會把它和主線、代付服務比對。", ...網站 }, null, 1) + "\n");
  const 代付 = 算指紋(await 讀們(代付檔們));
  await writeFile(path.join(根, "worker", "版本.js"),
    `// 代付服務的版本指紋（tools/產生版本指紋.mjs 產生，不要手改）。GET /health 會回報它。\nexport const 版本 = ${JSON.stringify(代付, null, 1)};\n`);
  console.log(`網站總指紋 ${網站.總指紋}（${Object.keys(網站.檔案).length} 個檔）；代付服務總指紋 ${代付.總指紋}`);
}
