import assert from "node:assert/strict";
import test from "node:test";
import { 規矩表 } from "../../gate/規矩表.mjs";
import { 有加密 } from "../../trust-gate.js";
import worker, { 上限值, 規矩 } from "../../worker/worker.js";
import { 固定代理們 } from "../../worker/fixed-prompts.js";

test("閘門規矩表包含 10～16，且每條都有實作位置", () => {
  assert.deepEqual(規矩表.map((rule) => rule.編號), [10, 11, 12, 13, 14, 15, 16]);
  assert.ok(規矩表.every((rule) => rule.修在哪.trim()));
});

test("正式夥伴採 HTTPS，本機開發可用 HTTP", () => {
  assert.equal(有加密("https://partner.example"), true);
  assert.equal(有加密("http://partner.example"), false);
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.equal(有加密(`http://${host}:8080`), true);
  }
});

test("每日額度可設成 0，缺省值仍生效", () => {
  assert.equal(上限值("0", 9), 0);
  assert.equal(上限值("12", 9), 12);
  assert.equal(上限值(undefined, 9), 9);
  for (const value of ["", "-1", "1.5", "12 次"]) {
    assert.ok(Number.isNaN(上限值(value, 9)));
  }
});

const origin = "https://hub.example";
const question = () => new Request("https://worker.example/v1/chat/completions", {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: 規矩.模型們[0],
    messages: [
      { role: "system", content: 固定代理們[0].系統提示 },
      { role: "user", content: "Hello" },
    ],
  }),
});

const config = (counter) => ({
  ALLOWED_ORIGINS: origin,
  OTARI_KEY: "test-only",
  LIMITS: { idFromName: (name) => name, get: () => ({ fetch: counter }) },
});

test("設定錯誤時，代付在計數器之前停止", async (t) => {
  const counter = t.mock.fn();
  const upstream = t.mock.fn();
  const response = await worker.fetch(question(), { ...config(counter), DAILY_CAP: "" }, {}, upstream);
  assert.equal(response.status, 503);
  assert.equal(counter.mock.callCount(), 0);
  assert.equal(upstream.mock.callCount(), 0);
});

test("計數器無法提供判定時，代付停止", async (t) => {
  const counter = t.mock.fn(() => Response.json({}));
  const upstream = t.mock.fn();
  const response = await worker.fetch(question(), config(counter), {}, upstream);
  assert.equal(response.status, 503);
  assert.equal(counter.mock.callCount(), 1);
  assert.equal(upstream.mock.callCount(), 0);
});

test("今日免費額度為 0 時，代付回報額度已用完", async (t) => {
  const counter = t.mock.fn((_, options) => {
    assert.equal(JSON.parse(options.body).全站, 0);
    return Response.json({ 超過: "全站" });
  });
  const upstream = t.mock.fn();
  const response = await worker.fetch(question(), { ...config(counter), DAILY_CAP: "0" }, {}, upstream);
  assert.equal(response.status, 429);
  assert.equal(counter.mock.callCount(), 1);
  assert.equal(upstream.mock.callCount(), 0);
});
