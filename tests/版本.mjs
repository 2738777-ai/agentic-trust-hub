// 版本對齊・規矩表與測試（先訂規矩，程式照表走；每一條一個會咬人的測試）
//   1 版本指紋只看內容：每個檔案算 SHA-256，再合成一個總指紋。不靠提交編號（部署的地方拿不到）。
//   2 version.json（網站）和 worker/版本.js（代付服務）必須和現在的內容一致；改了檔案忘了重產，測試就失敗。
//   3 代付服務 GET /health：任何來源都能看，只回指紋，不碰金鑰、不計額度、不收任何資料。
//   4 部署驗收頁 deploy-check.html：比三方——主線（GitHub 原始檔）、網站（version.json＋把網站上的檔案重算一次）、代付服務（/health）。
//     全部一致才綠；哪一個落後就直接說哪一個。
// 用法：node tests/版本.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const 根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { 算指紋, 網站檔們, 代付檔們 } = await import(pathToFileURL(path.join(根, "tools", "產生版本指紋.mjs")).href);
let 過 = 0, 錯 = 0;
async function 試(名, fn) {
  try { await fn(); 過++; console.log(`  ✓ ${名}`); }
  catch (e) { 錯++; console.log(`  ✗ ${名}\n      ${String(e.message).split("\n")[0]}`); }
}

await 試("1 指紋只看內容：同樣的內容同樣的指紋，改一個字就不一樣", async () => {
  const 甲 = 算指紋([{ 路: "a.js", 內容: Buffer.from("x") }]);
  const 乙 = 算指紋([{ 路: "a.js", 內容: Buffer.from("x") }]);
  const 丙 = 算指紋([{ 路: "a.js", 內容: Buffer.from("y") }]);
  assert.equal(甲.總指紋, 乙.總指紋);
  assert.notEqual(甲.總指紋, 丙.總指紋);
  assert.match(甲.總指紋, /^[0-9a-f]{12}$/);
});
await 試("2a version.json 和網站現在的內容一致（改了檔案要跑 node tools/產生版本指紋.mjs）", async () => {
  const 存的 = JSON.parse(await readFile(path.join(根, "version.json"), "utf8"));
  const 現在 = 算指紋(await Promise.all(網站檔們.map(async (路) => ({ 路, 內容: await readFile(path.join(根, 路)) }))));
  assert.deepEqual(存的.檔案, 現在.檔案);
  assert.equal(存的.總指紋, 現在.總指紋);
});
await 試("2b worker/版本.js 和代付服務現在的內容一致", async () => {
  const { 版本 } = await import(pathToFileURL(path.join(根, "worker", "版本.js")).href);
  const 現在 = 算指紋(await Promise.all(代付檔們.map(async (路) => ({ 路, 內容: await readFile(path.join(根, 路)) }))));
  assert.equal(版本.總指紋, 現在.總指紋);
});
await 試("3 代付服務 GET /health：任何來源都能看、只回指紋、不碰金鑰、不計額度", async () => {
  const 服務 = (await import(pathToFileURL(path.join(根, "worker", "worker.js")).href)).default;
  const { 版本 } = await import(pathToFileURL(path.join(根, "worker", "版本.js")).href);
  let 計數 = 0;
  const env = { OTARI_KEY: "sk-secret-of-the-site", LIMITS: { idFromName: (n) => n, get: () => ({ fetch: async () => { 計數++; return new Response("{}"); } }) } };
  for (const 來源 of ["https://evil.example", null]) {
    const r = await 服務.fetch(new Request("https://w.example/health", { headers: 來源 ? { Origin: 來源 } : {} }), env, {}, async () => { throw new Error("不該對外連線"); });
    assert.equal(r.status, 200, String(來源));
    const 文 = await r.text();
    const 答 = JSON.parse(文);
    assert.equal(答.總指紋, 版本.總指紋);
    assert.ok(!文.includes("sk-"), "不准出現金鑰");
  }
  assert.equal(計數, 0, "看健康不計額度");
  const p = await 服務.fetch(new Request("https://w.example/health", { method: "POST", headers: { Origin: "https://evil.example" }, body: "x" }), env, {}, fetch);
  assert.notEqual(p.status, 200, "只准 GET");
});
await 試("4 部署驗收頁比三方：主線、網站（含重算網站上的檔案）、代付服務", async () => {
  const 頁 = await readFile(path.join(根, "deploy-check.html"), "utf8");
  assert.match(頁, /raw\.githubusercontent\.com\/2738777-ai\/agentic-trust-hub\/main\/version\.json/);
  assert.match(頁, /\.\/version\.json/);
  assert.match(頁, /\/health/);
  assert.match(頁, /crypto\.subtle\.digest\("SHA-256"/);
  for (const 字 of ["主線", "網站", "代付服務", "落後"]) assert.ok(頁.includes(字), `頁面要有「${字}」`);
});
console.log(`\n版本對齊：${過} 過、${錯} 錯`);
process.exitCode = 錯 ? 1 : 0;
