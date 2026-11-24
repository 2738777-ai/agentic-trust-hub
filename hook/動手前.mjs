#!/usr/bin/env node
// 萬用插座・動手前關卡（Claude Code 的 PreToolUse 掛勾）
// 代理要連網或把東西送出去之前，先把這一下翻成三個代碼，交給 代理動作法典.txt 判：
//   綠／黃 → 不出聲（照 Claude Code 原本的權限流程走）　待審 → 停下來問人　拒 → 不准做
// 判斷核心在 判斷.mjs（MCP 接口也用同一份）。插座自己出錯時一律不准（讀不到就拒）。
import { appendFileSync } from "node:fs";
import { 判這一下 } from "./判斷.mjs";

let 輸入字 = "";
for await (const 塊 of process.stdin) 輸入字 += 塊;
let 回;
try {
  const 入 = JSON.parse(輸入字);
  const r = await 判這一下({ 工具: 入.tool_name, 參數: 入.tool_input ?? {}, cwd: 入.cwd, 紀錄檔: 入.transcript_path });
  if (process.env.HUB_LOG) try { appendFileSync(process.env.HUB_LOG, JSON.stringify({ 時: new Date().toISOString(), 工具: 入.tool_name, 主機: r.主機, 結果: r.結果, 決定: r.決定 }) + "\n"); } catch { /* 記錄失敗不影響判決 */ }
  if (r.決定 === "拒") 回 = { 決定: "deny", 句: r.句 + "｜" + r.英句 };
  else if (r.決定 === "待審") 回 = { 決定: "ask", 句: r.句 + "｜" + r.英句 };
  else 回 = null;   // 綠、黃：不出聲
} catch (e) {
  回 = { 決定: "deny", 句: `萬用插座：讀不到，依法典「讀不到結果：拒」不准做（${String(e.message).slice(0, 120)}）｜Agentic Trust Hub: could not evaluate, denied (fail closed)` };
}
if (回) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: 回.決定, permissionDecisionReason: 回.句 } }));
process.exit(0);
