// 萬用插座・模型代付服務測試：照 worker/worker.js 開頭的規矩表，一條一條咬。
import assert from "node:assert/strict";
import 服務, { 規矩 } from "../worker/worker.js";

const 站 = "https://2738777-ai.github.io";
class 假KV { constructor() { this.表 = new Map(); } async get(k) { return this.表.get(k) ?? null; } async put(k, v) { this.表.set(k, v); } }
const 環境 = (多 = {}) => ({ OTARI_KEY: "sk-secret-of-the-site", LIMITS: new 假KV(), ...多 });
const 上游紀錄 = [];
const 假上游 = (狀態 = 200) => async (網址, 選項) => {
  上游紀錄.push({ 網址, 選項 });
  return new Response(狀態 === 200 ? 'data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n' : "account details here", { status: 狀態 });
};
const 問 = (本體, { 來源 = 站, 方法 = "POST", 路 = "/v1/chat/completions", 標頭 = {} } = {}) =>
  new Request(`https://hub-llm.example.workers.dev${路}`, { method: 方法, headers: { "Content-Type": "application/json", ...(來源 ? { Origin: 來源 } : {}), ...標頭 }, body: 方法 === "POST" ? (typeof 本體 === "string" ? 本體 : JSON.stringify(本體)) : undefined });
const 好 = { model: 規矩.模型們[0], messages: [{ role: "user", content: "hi" }], stream: true, tools: [{ type: "function", function: { name: "website_get_hub_overview", parameters: { type: "object" } } }] };

let 過 = 0, 錯 = 0;
async function 試(名, f) { try { await f(); 過++; console.log("通過", 名); } catch (e) { 錯++; console.log("失敗", 名, e.message); } }

await 試("1 正常：串流原樣轉回、帶 CORS", async () => {
  const r = await 服務.fetch(問(好), 環境(), {}, 假上游());
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), 站);
  assert.match(await r.text(), /"hi"/);
});
await 試("2 瀏覽器送來的 Authorization 丟掉，只用伺服器祕密", async () => {
  上游紀錄.length = 0;
  await 服務.fetch(問(好, { 標頭: { Authorization: "Bearer sk-visitor-key" } }), 環境(), {}, 假上游());
  assert.equal(上游紀錄[0].選項.headers.Authorization, "Bearer sk-secret-of-the-site");
  assert.ok(!JSON.stringify(上游紀錄[0]).includes("sk-visitor-key"));
});
await 試("3 max_tokens 由服務定，不信瀏覽器；不轉送多的欄位", async () => {
  上游紀錄.length = 0;
  await 服務.fetch(問({ ...好, max_tokens: 999999, temperature: 2, user: "x" }), 環境(), {}, 假上游());
  const 送 = JSON.parse(上游紀錄[0].選項.body);
  assert.equal(送.max_tokens, 規矩.max_tokens);
  assert.deepEqual(Object.keys(送).sort(), ["max_tokens", "messages", "model", "stream", "tool_choice", "tools"]);
});
await 試("4 不在清單的網站、沒有來源：403（錯誤也帶 CORS）", async () => {
  const r = await 服務.fetch(問(好, { 來源: "https://evil.example" }), 環境(), {}, 假上游());
  assert.equal(r.status, 403);
  assert.ok(r.headers.get("Access-Control-Allow-Origin"));
  assert.equal((await 服務.fetch(問(好, { 來源: null }), 環境(), {}, 假上游())).status, 403);
});
await 試("5 不在清單的模型：400，說明能用哪個", async () => {
  const r = await 服務.fetch(問({ ...好, model: "openai/gpt-5-pro" }), 環境(), {}, 假上游());
  assert.equal(r.status, 400);
  assert.match(await r.text(), /qwen/);
});
await 試("6 太大的請求：413；壞 JSON：400", async () => {
  assert.equal((await 服務.fetch(問({ ...好, messages: [{ role: "user", content: "x".repeat(規矩.本體上限) }] }), 環境(), {}, 假上游())).status, 413);
  assert.equal((await 服務.fetch(問("{not json"), 環境(), {}, 假上游())).status, 400);
});
await 試("7 每個 IP 每天上限：用完回 429 純文字（聊天視窗原樣顯示）", async () => {
  const e = 環境({ PER_IP_DAILY: "2" });
  const ip = { 標頭: { "CF-Connecting-IP": "1.2.3.4" } };
  assert.equal((await 服務.fetch(問(好, ip), e, {}, 假上游())).status, 200);
  assert.equal((await 服務.fetch(問(好, ip), e, {}, 假上游())).status, 200);
  const r = await 服務.fetch(問(好, ip), e, {}, 假上游());
  assert.equal(r.status, 429);
  assert.match(r.headers.get("Content-Type"), /^text\/plain/);
  assert.match(await r.text(), /own key/);
  assert.equal((await 服務.fetch(問(好, { 標頭: { "CF-Connecting-IP": "5.6.7.8" } }), e, {}, 假上游())).status, 200, "別的 IP 不受影響");
});
await 試("8 全站每天上限", async () => {
  const e = 環境({ DAILY_CAP: "1" });
  assert.equal((await 服務.fetch(問(好), e, {}, 假上游())).status, 200);
  assert.equal((await 服務.fetch(問(好), e, {}, 假上游())).status, 429);
});
await 試("9 沒設祕密或沒綁 KV：拒絕服務（不會變成沒有上限）", async () => {
  assert.equal((await 服務.fetch(問(好), 環境({ OTARI_KEY: "" }), {}, 假上游())).status, 503);
  assert.equal((await 服務.fetch(問(好), 環境({ LIMITS: undefined }), {}, 假上游())).status, 503);
});
await 試("10 上游錯誤不外洩內容；沒錢（402）當成額度用完", async () => {
  const r = await 服務.fetch(問(好), 環境(), {}, 假上游(500));
  assert.equal(r.status, 502);
  assert.ok(!(await r.text()).includes("account details"));
  assert.equal((await 服務.fetch(問(好), 環境(), {}, 假上游(402))).status, 429);
});
await 試("11 預檢 OPTIONS、模型清單、其他路徑", async () => {
  assert.equal((await 服務.fetch(問(null, { 方法: "OPTIONS" }), 環境(), {}, 假上游())).status, 204);
  const m = await 服務.fetch(問(null, { 方法: "GET", 路: "/v1/models" }), 環境(), {}, 假上游());
  assert.deepEqual((await m.json()).data.map((x) => x.id), 規矩.模型們);
  assert.equal((await 服務.fetch(問(好, { 路: "/v1/embeddings" }), 環境(), {}, 假上游())).status, 404);
});
await 試("12 模型清單和網路檔的模型一致", async () => {
  const { readFile } = await import("node:fs/promises");
  const 網 = JSON.parse(await readFile(new URL("../trust_hub.network.json", import.meta.url), "utf8"));
  assert.ok(規矩.模型們.includes(網.llm_config.model_name));
});
console.log(`\n代付服務：${過} 過、${錯} 錯`);
process.exitCode = 錯 ? 1 : 0;
