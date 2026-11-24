// 萬用插座・動手前判斷（共用核心）：Claude Code 掛勾（動手前.mjs）和 MCP 接口（mcp/伺服器.mjs）都用這一份
// 一次工具呼叫 → 三個代碼（誰要的、送去哪、帶了什麼）→ 代理動作法典判（最壞的贏）
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { 翻譯, 判定 } from "../core/翻譯器.mjs";

const 這裡 = path.dirname(fileURLToPath(import.meta.url));
const 讀 = (f) => { try { return readFileSync(f, "utf8"); } catch { return null; } };
const 睡 = (ms) => new Promise((r) => setTimeout(r, ms));
export const 預設法典路徑 = path.join(這裡, "代理動作法典.txt");
export const 讀法典 = (路 = process.env.HUB_LAW ?? 預設法典路徑) => 翻譯(讀(路));

// ---------- 從工具呼叫裡找出「要連去哪」 ----------
const 網址樣 = /\b(?:https?|wss?|ftp):\/\/([^\s/'"`<>()\\]+)/gi;
const 連網指令 = /(^|[\s;|&(`])(curl|wget|nc|ncat|netcat|ssh|scp|sftp|rsync|ftp|telnet|http|https|Invoke-WebRequest|iwr)(\s|$)/i;
export function 主機們(工具, 輸入) {
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
export const 帶祕密 = (輸入) => { const 字 = JSON.stringify(輸入 ?? {}); return 祕密樣們.some((r) => r.test(字)); };

// ---------- 誰發起的：看對話紀錄，網址最早出現在使用者打的字、還是讀回來的內容 ----------
export function 讀紀錄(路) {
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
export function 來歷(紀錄, 主機們) {
  if (!紀錄) return "查不到紀錄";
  const 各 = 主機們.map((h) => (紀錄.使用者.includes(h) ? "使用者本人" : 紀錄.讀到.includes(h) ? "讀到的內容" : "代理自己想的"));
  return ["讀到的內容", "代理自己想的", "使用者本人"].find((x) => 各.includes(x)) ?? "使用者本人";
}

// 給 MCP 用：呼叫的代理自己附上「使用者說的話」和「讀回來的內容」（沒有對話紀錄檔時）
export const 文字紀錄 = (使用者說, 讀回來) => (使用者說 == null && 讀回來 == null ? null : { 使用者: String(使用者說 ?? "").toLowerCase(), 讀到: String(讀回來 ?? "").toLowerCase() });

const 說明 = {
  發起者檢查: { 讀到的內容: "這個網址只出現在代理讀回來的網頁或檔案裡，不是使用者要的", 查不到紀錄: "讀不到對話紀錄，不知道是誰要連的", 代理自己想的: "使用者沒提過這個網址" },
  目的地檢查: { 怪地址: "目的地是直接的 IP、偽裝字或看不出來", 表上沒有: "不在允許清單上" },
  內容檢查: { 有祕密: "要送出去的東西裡有金鑰、密碼或存祕密的檔案" },
};
const 說明英 = {
  發起者檢查: { 讀到的內容: "this URL only appears in content the agent read, not in anything the user said", 查不到紀錄: "no transcript: unknown who asked for this", 代理自己想的: "the user never mentioned this URL" },
  目的地檢查: { 怪地址: "the destination is a raw IP or looks disguised", 表上沒有: "not on the allowlist" },
  內容檢查: { 有祕密: "the payload contains a key, password or secret file" },
};
export const 權限對照 = { 綠: "allow", 黃: "allow", 待審: "ask", 拒: "deny" };

// 判這一下：{ 工具, 參數, cwd, 紀錄（物件）或 紀錄檔（路徑） } → 決定、理由、白話句
export async function 判這一下({ 工具, 參數 = {}, cwd, 紀錄, 紀錄檔 }, 法 = 讀法典()) {
  const 主機 = 主機們(工具, 參數);
  let 結果;
  if (!連外嗎(工具, 參數, 主機)) 結果 = { 發起者檢查: "使用者本人", 目的地檢查: "不連外", 內容檢查: "沒有祕密" };
  else {
    const 表 = 允許清單(cwd);
    let 紀 = 紀錄 ?? (紀錄檔 ? 讀紀錄(紀錄檔) : null), 發起 = 來歷(紀, 主機);
    if (發起 === "代理自己想的" && 紀錄檔 && !紀錄) { await 睡(300); 紀 = 讀紀錄(紀錄檔); 發起 = 來歷(紀, 主機); }   // 紀錄檔可能晚一點才寫進去
    const 目的地 = !主機.length ? "怪地址" : 主機.some(怪) ? "怪地址" : 主機.every((h) => 在表上(h, 表)) ? "表上有" : "表上沒有";
    結果 = { 發起者檢查: 主機.length ? 發起 : "查不到紀錄", 目的地檢查: 目的地, 內容檢查: 帶祕密(參數) ? "有祕密" : "沒有祕密" };
  }
  const { 決定, 理由 } = 判定(法, 結果);
  const 壞 = 理由.filter((r) => r.格 !== "綠" && r.格 !== "黃");
  const 句 = `萬用插座：${決定}。` + 壞.map((r) => `${說明[r.器]?.[r.代碼] ?? r.代碼}（法典第 ${r.行} 行）`).join("；") + (主機.length ? `。目的地：${主機.join("、")}` : "");
  const 英句 = `Agentic Trust Hub: ${權限對照[決定] ?? "deny"}. ` + 壞.map((r) => `${說明英[r.器]?.[r.代碼] ?? r.代碼} (law line ${r.行})`).join("; ") + (主機.length ? `. Destination: ${主機.join(", ")}` : "");
  return { 決定, 權限: 權限對照[決定] ?? "deny", 理由, 結果, 主機, 句, 英句 };
}
