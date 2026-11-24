#!/usr/bin/env node
// 萬用插座・動手前關卡（Claude Code 的 PreToolUse 掛勾）
// 代理要連網或把東西送出去之前，先把這一下翻成三個代碼，交給 代理動作法典.txt 判：
//   綠／黃 → 不出聲（照 Claude Code 原本的權限流程走）　待審 → 停下來問人　拒 → 不准做
// 判決引擎和攻防台、評審網頁是同一個（core/翻譯器.mjs）。插座自己出錯時一律不准（讀不到就拒）。
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { 翻譯, 判定 } from "../core/翻譯器.mjs";

const 這裡 = path.dirname(fileURLToPath(import.meta.url));
const 讀 = (f) => { try { return readFileSync(f, "utf8"); } catch { return null; } };
const 睡 = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 從工具呼叫裡找出「要連去哪」 ----------
const 網址樣 = /\b(?:https?|wss?|ftp):\/\/([^\s/'"`<>()\\]+)/gi;
const 連網指令 = /(^|[\s;|&(`])(curl|wget|nc|ncat|netcat|ssh|scp|sftp|rsync|ftp|telnet|http|https|Invoke-WebRequest|iwr)(\s|$)/i;
function 主機們(工具, 輸入) {
  const 字 = JSON.stringify(輸入 ?? {});
  const 有 = new Set();
  for (const m of 字.matchAll(網址樣)) 有.add(m[1].replace(/^[^@]*@/, "").replace(/:\d+$/, "").toLowerCase());
  const 指令 = String(輸入?.command ?? "");
  if (工具 === "Bash" && /(^|[\s;|&(`])(ssh|scp|sftp|rsync)(\s|$)/.test(指令)) for (const m of 指令.matchAll(/\b[\w.-]+@([a-z0-9.-]+\.[a-z]{2,})(?=[:\s]|$)/gi)) 有.add(m[1].toLowerCase());
  return [...有].filter((h) => h && !本機(h));
}
function 連外嗎(工具, 輸入, 主機) {
  if (主機.length) return true;
  const 字 = JSON.stringify(輸入 ?? {});
  if ([...字.matchAll(網址樣)].length) return false;   // 有網址但全是本機
  if (工具 === "Bash") return 連網指令.test(String(輸入?.command ?? ""));
  return 工具 === "WebFetch";
}

const 本機 = (h) => /^(localhost|127(\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)$/i.test(h);   // 連自己的電腦不算連外
// ---------- 目的地：允許清單 ----------
function 允許清單(cwd) {
  const 行們 = [讀(path.join(這裡, "允許網域.txt")), cwd && 讀(path.join(cwd, ".claude", "插座允許網域.txt")), (process.env.HUB_ALLOW ?? "").replace(/,/g, "\n")];
  return 行們.filter(Boolean).join("\n").split("\n").map((l) => l.replace(/#.*/, "").trim().toLowerCase()).filter(Boolean);
}
const 在表上 = (主機, 表) => 表.some((d) => 主機 === d || 主機.endsWith("." + d));
const 怪 = (主機) => /^\d{1,3}(\.\d{1,3}){3}$/.test(主機) || /^\[?[0-9a-f:]+\]?$/i.test(主機) && 主機.includes(":") || /(^|\.)xn--/.test(主機) || !主機.includes(".");

// ---------- 內容：有沒有祕密跟著出門 ----------
const 祕密樣們 = [
  /AKIA[0-9A-Z]{16}/, /\bsk-[A-Za-z0-9_-]{20,}/, /\bgh[pousr]_[A-Za-z0-9]{30,}/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(^|[\s"'=@<])(\.\/)?(\.env(\.[\w-]+)?|id_rsa|id_ed25519|\.netrc|\.npmrc|\.pypirc|credentials(\.json)?|\.aws\/credentials)(?=[\s"'|;)&]|$)/,
  /\$\{?[A-Z0-9_]*(TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|ACCESS_?KEY)[A-Z0-9_]*\}?/,
];
const 帶祕密 = (輸入) => { const 字 = JSON.stringify(輸入 ?? {}); return 祕密樣們.some((r) => r.test(字)); };

// ---------- 誰發起的：看對話紀錄，網址最早出現在使用者打的字、還是讀回來的內容 ----------
function 讀紀錄(路) {
  const 原 = 路 && 讀(路); if (原 == null) return null;
  const 使用者 = [], 讀到 = [];
  for (const 行 of 原.split("\n")) {
    let o; try { o = JSON.parse(行); } catch { continue; }
    if (o?.type !== "user" || o.isMeta) continue;
    const c = o.message?.content;
    if (typeof c === "string") { 使用者.push(c); continue; }
    if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (b?.type === "text") 使用者.push(b.text ?? "");
      else if (b?.type === "tool_result") 讀到.push(typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? ""));
    }
  }
  return { 使用者: 使用者.join("\n").toLowerCase(), 讀到: 讀到.join("\n").toLowerCase() };
}
function 來歷(紀錄, 主機們) {
  if (!紀錄) return "查不到紀錄";
  const 各 = 主機們.map((h) => (紀錄.使用者.includes(h) ? "使用者本人" : 紀錄.讀到.includes(h) ? "讀到的內容" : "代理自己想的"));
  return ["讀到的內容", "代理自己想的", "使用者本人"].find((x) => 各.includes(x)) ?? "使用者本人";
}

// ---------- 主程式 ----------
async function 判這一下(輸入字) {
  const 入 = JSON.parse(輸入字);
  const 工具 = 入.tool_name, 參數 = 入.tool_input ?? {};
  const 主機 = 主機們(工具, 參數);
  if (!連外嗎(工具, 參數, 主機)) return { 結果: { 發起者檢查: "使用者本人", 目的地檢查: "不連外", 內容檢查: "沒有祕密" }, 主機, 入 };
  const 表 = 允許清單(入.cwd);
  let 紀錄 = 讀紀錄(入.transcript_path), 發起 = 來歷(紀錄, 主機);
  if (發起 === "代理自己想的" && 紀錄) { await 睡(300); 紀錄 = 讀紀錄(入.transcript_path); 發起 = 來歷(紀錄, 主機); }   // 紀錄檔可能晚一點才寫進去
  const 目的地 = !主機.length ? "怪地址" : 主機.some(怪) ? "怪地址" : 主機.every((h) => 在表上(h, 表)) ? "表上有" : "表上沒有";
  return { 結果: { 發起者檢查: 主機.length ? 發起 : "查不到紀錄", 目的地檢查: 目的地, 內容檢查: 帶祕密(參數) ? "有祕密" : "沒有祕密" }, 主機, 入 };
}

const 說明 = {
  發起者檢查: { 讀到的內容: "這個網址只出現在代理讀回來的網頁或檔案裡，不是使用者要的", 查不到紀錄: "讀不到對話紀錄，不知道是誰要連的", 代理自己想的: "使用者沒提過這個網址" },
  目的地檢查: { 怪地址: "目的地是直接的 IP、偽裝字或看不出來", 表上沒有: "不在允許清單上" },
  內容檢查: { 有祕密: "要送出去的東西裡有金鑰、密碼或存祕密的檔案" },
};
let 輸入字 = "";
for await (const 塊 of process.stdin) 輸入字 += 塊;
let 回;
try {
  const 法 = 翻譯(讀(process.env.HUB_LAW ?? path.join(這裡, "代理動作法典.txt")));
  const { 結果, 主機 } = await 判這一下(輸入字);
  const { 決定, 理由 } = 判定(法, 結果);
  const 壞 = 理由.filter((r) => r.格 !== "綠" && r.格 !== "黃");
  const 句 = `萬用插座：${決定}。` + 壞.map((r) => `${說明[r.器]?.[r.代碼] ?? r.代碼}（法典第 ${r.行} 行）`).join("；") + (主機.length ? `。目的地：${主機.join("、")}` : "") +
    "｜Agentic Trust Hub: " + ({ 待審: "needs a human", 拒: "denied" }[決定] ?? "ok");
  if (process.env.HUB_LOG) try { appendFileSync(process.env.HUB_LOG, JSON.stringify({ 時: new Date().toISOString(), 工具: JSON.parse(輸入字).tool_name, 主機, 結果, 決定 }) + "\n"); } catch { /* 記錄失敗不影響判決 */ }
  if (決定 === "拒") 回 = { 決定: "deny", 句 };
  else if (決定 === "待審") 回 = { 決定: "ask", 句 };
  else 回 = null;   // 綠、黃：不出聲
} catch (e) {
  回 = { 決定: "deny", 句: `萬用插座：讀不到，依法典「讀不到結果：拒」不准做（${String(e.message).slice(0, 120)}）｜Agentic Trust Hub: could not evaluate, denied (fail closed)` };
}
if (回) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: 回.決定, permissionDecisionReason: 回.句 } }));
process.exit(0);
