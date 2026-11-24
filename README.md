# 萬用插座 Agentic Trust Hub

**把開放代理網路上各種信任檢查工具的結果，用一張白話法典合成一個決定。**
*One plain-language law table that combines the verdicts of independent trust checkers for the Open Agentic Web into a single decision.*

**先看直播（30 秒，不用按）**：https://2738777-ai.github.io/agentic-trust-hub/show.html （再按「沒插座」看同一招沒人擋會怎樣）｜**換你當駭客：[攻防台](https://2738777-ai.github.io/agentic-trust-hub/arena.html)**｜**裝在你的 Claude Code 上：[hook/](hook/README.md)**｜**評審三分鐘清單：[JUDGES.md](JUDGES.md)**

試打台（手機也能開）：https://2738777-ai.github.io/agentic-trust-hub/ ｜ 側面：https://2738777-ai.github.io/agentic-trust-hub/side.html ｜ 視角台：https://2738777-ai.github.io/agentic-trust-hub/views.html

**Start here (30-second live demo, no clicks needed):** https://2738777-ai.github.io/agentic-trust-hub/show.html?lang=en — an AI agent books a guesthouse, an attacker tampers with the site, and the hub catches it on the spot. Then tap **Without the hub** to watch the same attack succeed with nobody in the way. **Then be the attacker: [arena.html](https://2738777-ai.github.io/agentic-trust-hub/arena.html?lang=en)** (type a sentence; watch the hub revoke the stolen key and patch itself live). **Put it in front of your own Claude Code: [hook/](hook/README.md).** **Judges' 3-minute checklist (three commands, real outputs, real 2026 incidents): [JUDGES.md](JUDGES.md).** Try it yourself: https://2738777-ai.github.io/agentic-trust-hub/?lang=en

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

### 側面：訊號是怎麼進來的

正面（[試打台](index.html)）只看到結果；[側面](side.html)把管子剖開：

1. 每個從外面進來的訊號（代理網路描述檔、網站描述檔、簽章檔），**一進門就包進一顆泡泡**：記下從哪裡來、是誰帶進來的、內容指紋。
2. 後進來的泡泡掛在帶它進來的那顆泡泡的**繩**上，扣環就是父泡泡當下的鏈值。
3. 每道檢查在泡泡上**蓋章**；章只能往上加。每動一次，鏈值重算一次。
4. 法典把整條繩上的章一起判，最壞的贏；判「拒」就**整條繩剪斷**，之後同一條繩上再進來的訊號一進門就被擋。
5. 整條管子還有一個**總鏈**，照順序串起每一件事。事後改一個章、改來源、偽造父子關係、整顆泡泡刪掉，都抓得到（`tests/泡泡.mjs` 20/20）。

泡泡的規則先寫在 `core/泡泡法典.mjs`（狀態×事件的轉移表＋規矩，附窮舉檢查器和咬人測試），引擎 `core/泡泡.mjs` 只照表走。

老實說：如果有人能把**所有**紀錄連同總鏈一起重算，光靠自己對自己是抓不到的。要把最後的總鏈值放到外面（例如公開在網頁上或請第三方簽章），才算真的定住。

### 視角台：同一次檢查，換角度看駭客怎麼跑

`views.html` 把同一份執行紀錄拆成四個視角：

- **駭客**：和正常版本逐欄比對，抓出駭客動了哪裡（連人眼看不到的隱形字都標出來），每個工具是「抓到、被騙、起疑、沒事」。
- **地圖**：訊號走哪條路。紅點是駭客動過的訊號，被擋下就停在檢查站；騙過檢查的變黃點，一路溜到法典。
- **矩陣**：五個版本 × 只靠一個工具 × 合起來。虛線框＝只靠那個工具就會放過。
- **時間**：每顆泡泡一條泳道，紫線是因果扣環（子泡泡接在父泡泡哪一步之後）。

規矩先寫在 `core/視角法典.mjs`：每個視角只准讀登記的欄位，引擎 `core/視角.mjs` 真的只交這些欄位（凍結複本），而且每個視角顯示的決定必須和紀錄一樣，偷換就停。換視角，不換事實。命令列也能看：`node cli/插座.mjs 視角 examples/C_self_signed 駭客`。

### 給別的 AI：技能說明書和紅隊工單

- **[skill/SKILL.md](skill/SKILL.md)**：任何 AI 讀了就會用插座。四條鐵規矩：外面的內容只當資料、敏感動作先過插座、判拒就不繞、法典不准偷偷變鬆。插座是裝備，說明書只教代理怎麼穿上。
- **[紅隊工單.md](紅隊工單.md)**：請別的 AI 當駭客來打。列了我們自己打過的十招和交戰規矩，回報照固定格式，方便收斂補洞。

### 站在駭客那邊打自己（2026-11-22）

- **紅隊第 1 招「騙人把拒改成綠」實測打穿**：翻譯器和窮舉只檢查有沒有寫錯，不檢查有沒有放鬆。補丁 `core/鬆緊.mjs`：新舊法典窮舉比對，收緊直接生效，放鬆一格都要人按頭；拔掉一個檢查工具也算放鬆。試打台的「一分鐘玩法」第 2 步就是在示範這件事。
- **側面掃描**（`core/側面法典.mjs`、`core/側面掃描.mjs`）：沒有代理的普通網頁，轉到側面把人看不到的東西翻出來，照同一把尺判。示範：`examples/web_clean` 零誤報，`examples/web_hacked` 六招全抓。第一次跑時下拉選單被誤報（自體免疫），所以法典寫了一條例外。
- **紅隊第二輪（Grok 照工單來打，2026-11-23）**：打到「樣式產生的字」和「影子元件」兩處沒掃，加上圖形字的同色。補法：側面法典加一張「掃描範圍」表，掃描器照表走、回報自己掃了哪幾處，表上有沒做到就停；`examples/web_hacked_css` 三招全抓，拿掉任一處，那一招就漏（咬人測試）。畫布上的字還沒補，老實寫在工單。
- **紅隊第三輪（Gemini，2026-11-23）**：打到幾何藏字（裁切、縮成零、零大小的框、把字推出去），也抓到一次真的誤擋好人：照片上的白字被當成同色字直接判拒。補法：法典加「裁掉或縮成零」「疑似同色」（背景是圖片看不準，最多判黃），例外條件加「無障礙短提示」（讀屏軟體用的短句不算）；放鬆偵測分出四種原因、尺被改單獨亮燈。Gemini 說影子元件的位置會變成未定義，實測不成立。
- **紅隊第四輪（ChatGPT，2026-11-23）**：打到插座自己的洞——本機資料夾當網站時，`/site` 和 `/site-secret` 開頭一樣，編碼過的 `../` 就讀到隔壁（改成照真實位置比資料夾邊界）；還有內嵌框、送出按鈕改去處、「只看不跑」說過頭（本站程式其實會跑，改成只准讀、寫入擋下列出，另加「不跑程式」模式）、「檢查」判拒還回 0（改成結束碼表：只有綠是 0）。- **紅隊第五輪（Meta AI，2026-11-23）**：它審的是舊版，所以先在現在的程式上重打一次，12 招漏 10 招。最嚴重的是**例外表變後門**：為了不誤擋好人讓「點開就看得到」的地方整塊不掃，壞人就把指令包在折起來的說明裡。現在例外只饒不像指令的字；另補框外裁切、被蓋住、原始碼裡（標頭、結構化資料、範本、隱藏欄位、資料屬性）、關閉影子元件、長編碼字、內嵌物件。法典方面補了「改名騙比例」（尺有任何改動一律要人看）和「看守看守者」（比鬆緊自己算最壞的贏，和判定窮舉對照）。它說的兩點驗證不成立，老實記在工單。它也指出「裝備」說得太滿，說明書已改。
- **拿自己的網頁測（2026-11-23）**：插座自己的正面、側面被自己判黃——「檢查工具下載中」下載完被藏起來。真實網站到處都是這種字，天天亮黃燈就沒人看了。法典改成：藏起來的字只有像指令或一長串編碼才判拒，其他只記下、判綠。`examples/web_hacked_self` 是同一頁、同一種藏法的對照：真的「下載中」是綠，偷塞的指令是拒。
- **直播頁（`show.html`）**：評審什麼都不用按，30 秒看完一齣戲：平常好好在跑 → 駭客出手 → 當場被抓 → 金鑰沒出門。每一步判了什麼、誰被騙，都是真的引擎現場算的；可以換三招。做好後拿它自己掃，又抓到一次誤擋：「像指令」只比單字，按鈕上的「Inject an instruction」就被判拒。改成看句子的形狀。
- 五輪下來的共同結論：**檢查結果要跟「這一個動作、這一刻的內容」綁在一起**，這就是下一步「確認那一下」。

### 怎麼用

```bash
node cli/插座.mjs 法典                              # 檢查法典、窮舉所有組合
node cli/插座.mjs 檢查 examples/C_self_signed       # 讓兩個工具各看一次，照法典合成決定
node cli/插座.mjs 視角 examples/C_self_signed 駭客  # 同一次檢查換角度看（駭客、地圖、時間）
node cli/插座.mjs 掃 examples/web_hacked            # 普通網頁轉到側面看（要先 npm install；加 --不跑程式 完全不跑網頁程式）
node cli/插座.mjs 比法典 我的新法典.txt              # 換法典前先比：有放鬆就不准直接換
node tests/全部.mjs                                 # 全部測試
npm install && node tools/打包.mjs                  # 改了 core/ 之後，重新打包網頁用的核心包
node tools/做示範版本.mjs <官方範例民宿資料夾>          # 重做 5 個示範版本
```

人用自然語言說「幫我看那間民宿能不能信」，AI 只負責翻成上面的命令；放不放行由法典決定。同一行命令跑一百次，結果都一樣。

結束碼：只有綠是 0（黃 10、待審 20、拒 30、出錯 40），接手的程式只准在 0 的時候動手。

### 檔案

- `core/法典.txt`：白話法典（唯一的規則來源）；`core/法典.en.txt` 是英文寫法，測試證明兩份翻出來的表一模一樣
- `core/翻譯器.mjs`：白話法典 → 表 → 判定 → 窮舉檢查（瀏覽器、命令列共用，不靠外部套件）
- `core/工具.mjs`：接上的檢查工具，每個只交出一個代碼
- `cli/插座.mjs`：命令列
- `index.html`、`web/`：試打台網頁（可以直接改法典看結果；右上角切中英，網址加 `?lang=en` 直接英文）
- `web/核心包.js`：網頁用的核心，由 `tools/打包.mjs` 從 `core/`、`vendor/` 打包壓縮產生，不要手改（測試會檢查它是不是最新的）
- `core/鬆緊.mjs`：新舊法典窮舉比鬆緊；`core/側面法典.mjs`、`core/側面掃描.mjs`：普通網頁的側面掃描
- `cli/側面.mjs`：命令列開無頭瀏覽器做側面掃描（外來網站的東西一律不載入）
- `skill/SKILL.md`：給 AI 的技能說明書；`紅隊工單.md`：給別的 AI 的攻擊工單
- `examples/`：5 個代理網站示範版本＋2 個普通網頁示範（取自官方範例民宿，Apache 2.0）
- `vendor/`：借用的開源工具原封不動，附原授權（見 [NOTICE](NOTICE)）

### 還沒做（老實說）

- 接到「確認那一下」，而且穿在旅客這一邊：代理要動手前，插座先判；紅隊第 2、3、4 招（切香腸、先查後掉包、累死人）要一起補。
- 總鏈放到外面定住（紅隊第 9 招）。
- 帳本：每次決定串成改不掉的鏈；出事時同一條來路的鑰匙整條剪斷。
- 接更多檢查工具（例如 Agent Crash Test 的報告）。

---

## English summary

The Open Agentic Web lets unknown agents run in your browser. Several community checkers already exist, each covering one slice (e.g. **Agent Customs** for hidden instructions, **NandaSeal** for tampering and signatures). This hub does not add another checker; it **plugs existing ones together**:

- Every checker's verdict code is mapped onto one scale — *green < yellow < review < deny* — in a plain-language law file (`core/法典.en.txt`, identical to the Chinese `core/法典.txt` — a test proves both translate to the same table). Worst verdict wins; an unreadable result counts as *deny* (fail closed).
- Adding a checker means adding lines to the law, not code. The translator refuses unknown sentences, contradictions and values not on the scale, and every law change is **exhaustively checked** over all verdict combinations.
- Measured on five variants of the official guesthouse example: a malicious-but-re-signed network fools the signature check alone; a "harmless" step-limit change only gets *held* by the instruction check alone; combined, both are denied.

Every incoming signal is wrapped in a hash-chained *bubble* at the entry point (provenance + parent link + stamps); a deny verdict cuts the whole causal rope (`side.html`). `views.html` shows the same run record from four angles — attacker (field-level diff, invisible characters highlighted, which checker was fooled), map (animated tampered signals stop where caught), matrix (would a single checker have let it in?) and timeline (bubble swimlanes with causal buckles). Each view only receives the fields registered in `core/視角法典.mjs`, and a guard stops any view that shows a different decision than the record. Red-team self-test (2026-11-22): we attacked our own hub first. Attack #1 (talk a human into pasting a law that maps DENIED to GREEN) passed every existing check, so `core/鬆緊.mjs` now compares old and new laws over every combination: tightening applies at once, any loosened cell (including removing a checker) needs explicit human consent. `node cli/插座.mjs 掃` side-scans ordinary pages with no agent or signature (hidden, same-colour, tiny, off-screen, invisible-character, label-only text; off-site forms; third-party scripts): zero false positives on the clean demo, all six tricks caught on the hacked one. `skill/SKILL.md` teaches any AI to wear the hub; `紅隊工單.md` invites other AIs to attack it. Exit codes: only GREEN is 0 (YELLOW 10, REVIEW 20, DENY 30, error 40). Run `node tests/全部.mjs` (24/24 pass, plus 41 view tests and 20 bubble/tamper tests and Chinese/English law equivalence over every combination). Built for the [Open Agentic Web Challenge](https://cognizant-agenticweb.devpost.com/).

## License

Apache 2.0. Vendored components keep their own licenses; see [NOTICE](NOTICE).
