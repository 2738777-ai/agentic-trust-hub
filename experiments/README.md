# 實驗 · Experiments

同一個萬用插座（`core/翻譯器.mjs` 的判決引擎，一行沒改），換一張白話法典，就能守不同的地方。
The same hub engine (`core/翻譯器.mjs`, unchanged) guards different places just by swapping the plain-language law.

全部是模擬：假民宿、假鑰匙、假客戶，外送網址都是不存在的 `.invalid`，伺服器只開在本機。
Everything is simulated: fake guesthouse, fake keys and guests, `.invalid` addresses only, servers bound to localhost.

## 攻防循環 · Attack-and-defend loop（`攻防循環/`）
評審網頁：[`arena.html`](../arena.html)。測試：`node tests/攻防.mjs`（21 項，含兩口「咬一口」）。
- 三種模式＝同一張法典的三種鬆緊：沒補強（每格判綠、只記錄）、補強 1.0、補強 2.0。
- 被打一次 → 追因果繩 → 繩上經過的格子翻成完整法典的緊度（`比鬆緊` 證明放鬆 0）→ 照 `凍結法典.txt` 連坐作廢鑰匙（只連繩子碰到的）→ 下架評論、通知客戶。
- 恢復預設值、換一種說法再打，插座補的是別的格子：補哪裡跟著駭客打哪裡走。
- Three modes are one law at three tightness levels. A breach → trace the causal chain → flip exactly the cells on it to the full law's level (proven loosen-free) → revoke keys by `凍結法典.txt` (only what the chain touched) → take down the review, notify guests.

## 伺服器門口 · Server door（`伺服器門口/`）
- `node 實驗.mjs`：有路徑遍歷漏洞的伺服器不修，只在門口裝插座。3000 招隨機變形：沒防護 588 被偷、守衛代理說了算 177、守衛＋插座 0；正常請求誤擋 0。
- `node 修補實驗.mjs`：插座把 594 招整理成 44 種走法，全部匯到同一行程式，產生修補單；修補代理照單修，`修補驗收法典.txt` 把關。被下毒的修補（改設定、偷懶修法、刪測試、放寬法典）全被擋下或交給人。
- Unpatched path-traversal server behind the hub: 588 / 177 / 0 of 3000 random variants stolen (none / guard agent alone / guard + hub), 0 false positives. Then 594 working attacks collapse into 44 routes and one source line; poisoned patches are rejected by the patch-acceptance law.
