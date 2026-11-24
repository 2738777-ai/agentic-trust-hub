# 動手前關卡：把萬用插座裝在真的 AI 代理上 · Put the hub in front of a real agent

萬用插座最常見的用法：**AI 代理每次要連網、要把東西送出去之前，先過一張白話法典。**
這裡是給 [Claude Code](https://code.claude.com/docs/en/hooks) 的掛勾版本（工具執行前的 `PreToolUse` 掛勾）。

## 它判什麼 · What it checks
法典：[`代理動作法典.txt`](代理動作法典.txt)（10 條，75 種組合窮舉過）。每一次連外的工具呼叫翻成三個代碼：

| 檢查 | 代碼 | 判 |
|---|---|---|
| 誰要它連這個網址（看對話紀錄） | 使用者本人／代理自己想的／**讀到的內容**／查不到紀錄 | 綠／黃／**待審**／待審 |
| 送去哪 | 不連外／允許清單上／不在清單上／怪地址（直接 IP 等） | 綠／綠／黃／待審 |
| 帶了什麼 | 沒有祕密／**有祕密**（金鑰、密碼、`.env`、私鑰、`$…TOKEN`） | 綠／**拒** |

最壞的贏。綠、黃：插座不出聲，照 Claude Code 原本的權限流程走。待審：停下來問你。拒：不准做。插座自己出錯：不准（讀不到就拒）。

- 「讀到的內容」＝這個網址只出現在代理讀回來的網頁或檔案裡，你從沒提過。這就是間接注入：網頁上藏一句話，牽著代理走。
- 連自己電腦（localhost）不算連外；提交訊息裡的電子信箱不算目的地。

## 安裝 · Install
```bash
git clone https://github.com/2738777-ai/agentic-trust-hub
```
在你的專案加 `.claude/settings.json`（路徑換成你 clone 的位置）：
```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash|WebFetch",
        "hooks": [ { "type": "command", "command": "node /path/to/agentic-trust-hub/hook/動手前.mjs" } ] }
    ]
  }
}
```
- 允許清單：`hook/允許網域.txt`；專案自己加在 `.claude/插座允許網域.txt`；或環境變數 `HUB_ALLOW=a.com,b.com`。
- 想留紀錄：環境變數 `HUB_LOG=/path/插座紀錄.jsonl`（每一次判決一行）。
- 想改規矩：改法典就好，或用 `HUB_LAW=/path/你的法典.txt`。放鬆前可以用 `node cli/插座.mjs 比法典 舊 新` 看放鬆了哪幾格。

測試：`node tests/動手前.mjs`（13 項，含不自體免疫與咬一口）。

## 老實說 · Honest limits
- **還沒在真的 Claude Code 上跑過完整一輪**：開發沙盒裡的 Claude Code 沒有登入權限。目前驗的是照官方規格送進來的工具呼叫、照公開格式造的對話紀錄。歡迎有電腦的人試，回報到 issue。
- 對話紀錄的格式沒有正式文件、會隨版本改；讀不懂時一律當「查不到紀錄」→ 問人，不會默默放行。紀錄檔可能晚一點才寫入，插座會等 0.3 秒再讀一次。
- 只看網址字串出現在哪裡。駭客把網址拆開、編碼，讓它在讀回來的內容裡看不出來，就會被當成「代理自己想的」（黃，不出聲）。
- 「帶祕密」是看字樣；把祕密先編碼再送，現在抓不到。帶著金鑰連它自己的服務（例如 `$GITHUB_TOKEN` 連 GitHub）也會被擋，比較嚴，之後再細分。
- 它是一道關卡，不是防毒軟體：不掃你的電腦，也管不到其他程式。

---
**English summary.** A Claude Code `PreToolUse` hook. Every outbound tool call (Bash with network commands, WebFetch) is mapped to three codes — *who asked for this URL* (from the transcript: the user, the agent itself, **only seen in fetched content**, or unknown), *destination* (allowlist / not / odd), *payload* (**contains secrets** or not) — and judged by a plain-language law with worst-wins. GREEN/YELLOW: stay silent (normal permission flow). REVIEW: ask the human. DENY: block. Internal error: deny. Tested with 13 cases against the documented hook I/O and transcript format; not yet run end-to-end inside a real Claude Code session (the dev sandbox cannot sign in) — reports welcome.
