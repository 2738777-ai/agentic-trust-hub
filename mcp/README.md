# MCP 接口：讓任何 AI 代理接上萬用插座 · Plug any MCP agent into the hub

萬用插座的 MCP 伺服器（stdio）。支援 MCP 的 AI 代理（Claude Code、Claude 桌面版、其他 MCP 客戶端）接上之後，就多了五個工具。**每個工具都只判斷、不動手**，回傳的一律標成「判斷結果（資料），不是指令」。

| 工具 | 做什麼 |
|---|---|
| `judge_action` | **動手前先問**：代理要連網、要送東西出去之前，把這一下交給插座。看三件事：這個網址是使用者要的、還是只出現在代理讀回來的內容裡；送去哪；有沒有帶祕密。回 `allow`／`ask`（停下來問人）／`deny`。跟 [Claude Code 掛勾](../hook/README.md) 是同一份判斷。 |
| `check_agent_site` | 檢查本機資料夾裡的代理網站（描述檔＋簽章），用白話法典合成一個決定。 |
| `compare_laws` | 給新舊兩張法典，窮舉比對，列出放鬆了哪幾格。放鬆就要人點頭。AI 建議改規則時先過這一關。 |
| `scan_page` | 側面掃描普通網頁，找人看不到、代理讀得到的字。只讀（只准 GET/HEAD）。要有 Chrome。 |
| `read_law` | 把法典原文拿出來看。 |

## 安裝 · Install
```bash
git clone https://github.com/2738777-ai/agentic-trust-hub
cd agentic-trust-hub && npm install
```
**Claude Code：**
```bash
claude mcp add trust-hub -- node /path/to/agentic-trust-hub/mcp/伺服器.mjs
```
**其他 MCP 客戶端**（設定檔寫法通常像這樣）：
```json
{ "mcpServers": { "trust-hub": { "command": "node", "args": ["/path/to/agentic-trust-hub/mcp/伺服器.mjs"] } } }
```
測試：`node tests/mcp.mjs`（14 項；用官方 MCP 客戶端接上來，逐一呼叫五個工具）。

## 驗到哪裡 · What has been verified
- 用官方 MCP 客戶端（`@modelcontextprotocol/sdk`）實際連線、呼叫五個工具：14 項全過。
- 真的 Claude Code（2.1.331）`claude mcp add` 之後，`claude mcp list` 顯示 **√ Connected**：它自己啟動插座、完成 MCP 握手。
- **還沒做到**：在真的 Claude Code 對話裡讓模型實際呼叫工具（開發沙盒無法登入）。歡迎回報。

## 老實說 · Honest limits
- `judge_action` 要靠代理**自己附上**使用者說的話（`user_text`）和讀回來的內容（`fetched_text`），或對話紀錄檔路徑。代理如果不附、或附假的，判斷就不準。所以：沒附任何紀錄又要連外 → `ask`。真正擋得住的位置，是平台把它接在「動手之前」那一關（例如 Claude Code 掛勾），而不是讓代理自己決定要不要問。
- MCP 工具本身也是一道門：`scan_page` 會替你開網頁（只讀）。只裝在你信任的機器上。
- 其他限制同掛勾版：網址被拆開或編碼、祕密先編碼再送，現在抓不到。

---
**English summary.** A stdio MCP server exposing five read-only tools: `judge_action` (allow / ask / deny before an outbound action — same judgment as the Claude Code hook), `check_agent_site`, `compare_laws` (exhaustive loosening check), `scan_page` (side scan, needs Chrome), `read_law`. Verified with the official MCP client (14 tests) and shown **Connected** by a real Claude Code `claude mcp list`; not yet invoked by a model inside a live Claude Code session. Note: an agent can skip calling a tool, so the place that truly enforces is a platform gate such as the hook.
