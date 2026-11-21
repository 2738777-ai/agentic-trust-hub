# 萬用插座 Agentic Trust Hub

**把開放代理網路上各種信任檢查工具的結果，用一張白話法典合成一個決定。**
*One plain-language law table that combines the verdicts of independent trust checkers for the Open Agentic Web into a single decision.*

試打台（手機也能開）：https://2738777-ai.github.io/agentic-trust-hub/

---

## 中文說明

代理網站會讓陌生的 AI 走進你的瀏覽器。現在已經有人做檢查工具，但每個只管一段：

| 工具 | 管什麼 | 授權 |
|---|---|---|
| [Agent Customs](https://github.com/montbaga/agent-customs) | 進門檢查：夥伴網站的代理指令裡有沒有藏壞東西 | Apache 2.0 |
| [NandaSeal](https://github.com/cocvn157/nanda-seal) | 真偽檢查：描述檔有沒有被偷改、簽章是不是真的 | MIT |

萬用插座不再做第三個檢查工具，而是把它們接成一條：

1. 每個工具的每一種結果，換到同一把尺：**綠 < 黃 < 待審 < 拒**。
2. **最壞的那一格贏**；讀不到結果一律當「拒」（出事就關門）。
3. 規則寫在 [`core/法典.txt`](core/法典.txt)，一行一條、用白話寫。要接新工具，只要多寫幾行，不用改程式。
4. 翻譯器看不懂、前後矛盾、寫了尺上沒有的格，一律停下來指出第幾行，不猜。
5. 每次改法典都自動窮舉所有組合，證明三件事永遠成立：決定一定是最壞的那一格；有工具說「拒」就一定拒；沒見過的代碼一定當最嚴。

### 為什麼要接在一起（實測）

拿官方範例民宿做了 5 個版本，兩個工具在瀏覽器（或命令列）各跑一次：

| 版本 | 進門檢查 | 真偽檢查 | 萬用插座 |
|---|---|---|---|
| A 正常、有簽章 | 放行 | 簽章是真的 | **綠** |
| B 被偷塞壞指令 | 拒絕進門 | 被偷改過 | **拒** |
| C 壞人塞指令還**自己重新簽章** | 拒絕進門 | 簽章是真的 ⚠️ | **拒** |
| D 偷改最多步數 12 → 500 | 先停下來等人看 | 被偷改過 | **拒** |
| E 正常但沒簽章 | 放行 | 沒有簽章 | **黃** |

C：只看簽章會被騙。D：只看指令只會「待審」。兩個接在一起才補起來。

### 怎麼用

```bash
node cli/插座.mjs 法典                              # 檢查法典、窮舉所有組合
node cli/插座.mjs 檢查 examples/C_self_signed       # 讓兩個工具各看一次，照法典合成決定
node tests/全部.mjs                                 # 全部測試
node tools/做示範版本.mjs <官方範例民宿資料夾>          # 重做 5 個示範版本
```

人用自然語言說「幫我看那間民宿能不能信」，AI 只負責翻成上面的命令；放不放行由法典決定。同一行命令跑一百次，結果都一樣。

### 檔案

- `core/法典.txt`：白話法典（唯一的規則來源）
- `core/翻譯器.mjs`：白話法典 → 表 → 判定 → 窮舉檢查（瀏覽器、命令列共用，不靠外部套件）
- `core/工具.mjs`：接上的檢查工具，每個只交出一個代碼
- `cli/插座.mjs`：命令列
- `index.html`、`web/`：試打台網頁（可以直接改法典看結果）
- `examples/`：5 個示範版本（取自官方範例民宿，Apache 2.0）
- `vendor/`：借用的開源工具原封不動，附原授權（見 [NOTICE](NOTICE)）

### 還沒做（老實說）

- 接到代理網站的「確認視窗」：代理要動手前，卡片上同時顯示所有工具的結果和法典決定。
- 帳本：每次決定串成改不掉的鏈；出事時同一條來路的鑰匙整條剪斷。
- 接更多檢查工具（例如 Agent Crash Test 的報告）。

---

## English summary

The Open Agentic Web lets unknown agents run in your browser. Several community checkers already exist, each covering one slice (e.g. **Agent Customs** for hidden instructions, **NandaSeal** for tampering and signatures). This hub does not add another checker; it **plugs existing ones together**:

- Every checker's verdict code is mapped onto one scale — *green < yellow < review < deny* — in a plain-language law file (`core/法典.txt`). Worst verdict wins; an unreadable result counts as *deny* (fail closed).
- Adding a checker means adding lines to the law, not code. The translator refuses unknown sentences, contradictions and values not on the scale, and every law change is **exhaustively checked** over all verdict combinations.
- Measured on five variants of the official guesthouse example: a malicious-but-re-signed network fools the signature check alone; a "harmless" step-limit change only gets *held* by the instruction check alone; combined, both are denied.

Run `node tests/全部.mjs` (11/11 pass). Built for the [Open Agentic Web Challenge](https://cognizant-agenticweb.devpost.com/).

## License

Apache 2.0. Vendored components keep their own licenses; see [NOTICE](NOTICE).
