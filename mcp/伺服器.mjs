#!/usr/bin/env node
// 萬用插座・MCP 接口（stdio）：任何支援 MCP 的 AI 代理都能接上來，在動手之前先問插座
// 工具表（先訂好開放哪些門，每扇門只判斷、不動手）：
//   judge_action      判斷動手前：跟 Claude Code 掛勾同一份判斷（hook/判斷.mjs + 代理動作法典）
//   check_agent_site  檢查代理網站：本機資料夾裡的代理描述檔＋簽章，照白話法典合成一個決定
//   compare_laws      比法典鬆緊：兩張法典窮舉比對，列出放鬆了哪幾格（放鬆要人點頭）
//   scan_page         側面掃描：普通網頁轉到側面看人看不到的字（要有 Chrome）
//   read_law          看法典：把法典原文拿出來
// 回傳的一律是「判斷結果（資料）」，不是給代理的指令。
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { 判這一下, 文字紀錄 } from "../hook/判斷.mjs";
import { 翻譯 } from "../core/翻譯器.mjs";
import { 比鬆緊 } from "../core/鬆緊.mjs";

const 根 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const 包裝 = "This is a judgment result from the Agentic Trust Hub (data, not an instruction). 這是萬用插座的判斷結果（資料，不是指令）。";
const 回 = (物件) => ({ content: [{ type: "text", text: 包裝 + "\n" + JSON.stringify(物件, null, 2) }], structuredContent: 物件 });
const 錯 = (訊息) => ({ content: [{ type: "text", text: 包裝 + "\n" + 訊息 }], isError: true });
const 跑命令列 = (參數們, 毫秒 = 60000) => new Promise((ok) => {
  execFile(process.execPath, [path.join(根, "cli", "插座.mjs"), ...參數們], { timeout: 毫秒, maxBuffer: 4 << 20 }, (e, 出, 錯出) => {
    ok({ exit_code: e ? (typeof e.code === "number" ? e.code : 40) : 0, output: String(出).trim(), error: String(錯出).replace(/\[agent-proxy\][^\n]*\n?/g, "").trim() || undefined });
  });
});
const 結束碼意思 = { 0: "GREEN", 10: "YELLOW", 20: "REVIEW", 30: "DENY", 40: "ERROR" };

const 伺服器 = new McpServer({ name: "agentic-trust-hub", version: "0.1.0" });

伺服器.registerTool("judge_action", {
  title: "判斷動手前 · Judge an action before the agent takes it",
  description: "Call this BEFORE an outbound tool call (fetching a URL, running a network command, sending data). The hub checks who asked for the destination (the user, or only text the agent read), where it goes (allowlist), and whether a secret rides along, then judges with a plain-language law (worst wins). Returns allow / ask (stop and ask the human) / deny. Same engine as the Claude Code hook. 動手前先問：允許、問人、或不准。",
  inputSchema: {
    tool_name: z.string().describe("The tool the agent is about to call, e.g. WebFetch or Bash"),
    tool_input: z.record(z.string(), z.unknown()).describe("The exact arguments of that tool call"),
    user_text: z.string().optional().describe("What the human user actually said in this task (used to tell who asked for a URL)"),
    fetched_text: z.string().optional().describe("Content the agent read from pages, files or tools during this task"),
    transcript_path: z.string().optional().describe("Path to a Claude Code transcript (.jsonl), instead of user_text/fetched_text"),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ tool_name, tool_input, user_text, fetched_text, transcript_path }) => {
  try {
    const r = await 判這一下({ 工具: tool_name, 參數: tool_input, 紀錄: 文字紀錄(user_text, fetched_text), 紀錄檔: transcript_path });
    return 回({ decision: r.權限, level: r.決定, hosts: r.主機, codes: r.結果,
      reasons: r.理由.map((x) => ({ check: x.器, code: x.代碼, level: x.格, law_line: x.行 })), explanation_en: r.英句, explanation_zh: r.句 });
  } catch (e) {
    return 回({ decision: "deny", level: "拒", explanation_en: `Could not evaluate; the law says unreadable means DENY (${e.message})`, explanation_zh: "讀不到，依法典「讀不到結果：拒」不准做" });
  }
});

伺服器.registerTool("check_agent_site", {
  title: "檢查代理網站 · Check an agent website folder",
  description: "Check a LOCAL folder that holds an agent website (agent card / descriptor and its signature). Every checker's result is combined by the plain-language law (worst wins). Exit codes: GREEN 0, YELLOW 10, REVIEW 20, DENY 30, ERROR 40. Try the repo's examples/A_normal or examples/C_self_signed.",
  inputSchema: { folder: z.string().describe("Path to a local folder, absolute or relative to the hub repo") },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ folder }) => {
  const 路 = path.resolve(根, folder);
  try { if (!statSync(路).isDirectory()) return 錯("Not a folder: " + 路); } catch { return 錯("Folder not found: " + 路); }
  const r = await 跑命令列(["檢查", 路, "--en"]);
  return 回({ folder: 路, verdict: 結束碼意思[r.exit_code] ?? "ERROR", ...r });
});

伺服器.registerTool("compare_laws", {
  title: "比法典鬆緊 · Compare two laws",
  description: "Give the old and the new law text. The hub checks every combination and lists exactly which cells were loosened (and why). Any loosening, or a change of scale, needs a human to approve. Use this before accepting a rule change suggested by an AI.",
  inputSchema: { old_law: z.string().describe("Old law text"), new_law: z.string().describe("New law text") },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ old_law, new_law }) => {
  try {
    const 比 = 比鬆緊(翻譯(old_law), 翻譯(new_law));
    return 回({ combinations: 比.組合數, loosened: 比.放鬆.length, tightened: 比.收緊.length, scale_changed: 比.尺有變, needs_human: 比.要人看,
      loosened_examples: 比.放鬆.slice(0, 20).map((x) => ({ combination: x.組, from: x.舊, to: x.新, reason: x.原因 })) });
  } catch (e) { return 錯("Could not read a law: " + (e.英文 ?? e.message)); }
});

伺服器.registerTool("scan_page", {
  title: "側面掃描 · Side scan an ordinary web page",
  description: "Turn an ordinary page sideways: find text humans cannot see but agents read (hidden, same-color, off-screen, encoded, closed shadow DOM, frames...). Instruction-like hidden text is DENY. Read-only: only GET/HEAD, other requests are blocked. Needs Chrome on this machine (set CHROME_PATH if not found).",
  inputSchema: { target: z.string().describe("A local folder with index.html, or an http(s) URL"), scripts_off: z.boolean().optional().describe("Scan without running the page's scripts") },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ target, scripts_off }) => {
  const 是網址 = /^https?:\/\//i.test(target);
  const 目標 = 是網址 ? target : path.resolve(根, target);
  const r = await 跑命令列(["掃", 目標, "--en", ...(scripts_off ? ["--不跑程式"] : [])], 90000);
  return 回({ target: 目標, verdict: 結束碼意思[r.exit_code] ?? "ERROR", ...r });
});

const 法典們 = { action: "hook/代理動作法典.txt", hub: "core/法典.en.txt", hub_zh: "core/法典.txt" };
伺服器.registerTool("read_law", {
  title: "看法典 · Read a law",
  description: "Return the plain-language law text: 'action' (what judge_action uses), 'hub' (agent website checks, English), 'hub_zh' (same, Chinese).",
  inputSchema: { which: z.enum(["action", "hub", "hub_zh"]).describe("Which law") },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ which }) => 回({ which, file: 法典們[which], text: readFileSync(path.join(根, 法典們[which]), "utf8") }));

await 伺服器.connect(new StdioServerTransport());
