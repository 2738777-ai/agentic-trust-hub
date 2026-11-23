// 側面法典：什麼叫「人看不到、機器讀得到」。先寫表，掃描器（core/側面掃描.mjs）只照表走。
// 用在沒有代理、沒有簽章的普通網頁：網頁照舊給人看，插座自己轉到側面看一次，把人看不到的翻出來。
// 格：藏起來的字像在下指令 → 拒；資料送到別家 → 拒；外來程式 → 待審；其他藏起來的字 → 黃。
// 表上沒有的發現 → 拒（空隙灌成水泥）。

export const 格們 = ["綠", "黃", "待審", "拒"];

// 「像在下指令」：藏起來的字裡出現這些，就當成想指揮代理
export const 像指令 = /(ignore|instruction|assistant|ai agent|system|send|forward|email|pay with|card number|api key|忽略|指令|轉寄|寄給|金鑰|卡號)/i;

export const 規則們 = [
  { 碼: "藏起來", 說: ["樣式設成不顯示或透明", "styled as not displayed or transparent"], 種: "字" },
  { 碼: "同色字", 說: ["字的顏色跟背景幾乎一樣", "text colour almost equals the background"], 種: "字" },
  { 碼: "小到看不見", 說: ["字小於 4 像素", "text smaller than 4 pixels"], 種: "字" },
  { 碼: "推到畫面外", 說: ["位置或字被推到畫面外面", "positioned or indented off screen"], 種: "字" },
  { 碼: "裁掉或縮成零", 說: ["被裁切、縮成零，或塞進零大小的框", "clipped, scaled to zero, or squeezed into a zero-size box"], 種: "字" },
  { 碼: "疑似同色", 說: ["背景是圖片，看不出字跟背景差多少", "background is an image, contrast cannot be judged"], 種: "字", 上限: "黃" },
  { 碼: "隱形字", 說: ["含人眼看不到的字元", "contains invisible characters"], 種: "字" },
  { 碼: "只給機器看", 說: ["藏在標籤、標題、替代文字裡", "hidden in a label, title or alt text"], 種: "字" },
  { 碼: "資料送別家", 說: ["表單或送出按鈕送到別的網站", "a form or submit button posts to another site"], 種: "流向", 格: "拒" },
  { 碼: "看不進去的框", 說: ["跨網站的內嵌框，掃描器看不到裡面", "a cross-site frame the scanner cannot look into"], 種: "流向", 格: "待審" },
  { 碼: "外來程式", 說: ["載入別的網站的程式", "loads a script from another site"], 種: "流向", 格: "待審" },
];

// 掃描範圍：要去哪些地方找。掃描器每一處都要有做法，而且會回報自己掃了哪些（表上有、沒做到的，測試會抓）。
// 2026-11-23 紅隊第二輪（Grok）打到「樣式產生的字」和「影子元件」兩個沒掃到的地方，所以這張表是後補的；第四輪（ChatGPT）再補上「子文件」。
export const 掃描範圍 = [
  { 處: "文字", 說: ["網頁上的一般文字（含圖形裡的字）", "ordinary text, including text inside graphics"] },
  { 處: "影子元件", 說: ["自成一格、外面看不進去的小區塊裡的字", "text inside shadow components"] },
  { 處: "樣式產生的字", 說: ["用樣式在前後加上的字（偽元素）", "text added by styles before/after an element"] },
  { 處: "標籤屬性", 說: ["標籤、標題、替代文字", "labels, titles, alt text"] },
  { 處: "子文件", 說: ["內嵌框裡的頁面：同網站的鑽進去掃，跨網站的列出來", "framed pages: same-site ones are scanned, cross-site ones are listed"] },
  { 處: "表單", 說: ["表單和送出按鈕送去哪裡", "where forms and submit buttons post"] },
  { 處: "程式", 說: ["載入了哪些程式", "which scripts load"] },
];

// 例外：人點一下就看得到的，不算藏字（不然會自體免疫，把正常網頁當壞人；2026-11-22 實測下拉選單誤報）
export const 例外們 = [
  { 選: "option", 說: ["下拉選單的選項，點開就看得到", "drop-down options, visible when opened"] },
  { 選: "details:not([open]) > :not(summary)", 說: ["折起來的說明，點開就看得到", "collapsed details, visible when opened"] },
];

// 例外條件：不是看選擇器，而是看情況（掃描器照名字做）
// 2026-11-23 Gemini 提醒：正常網站會藏短短一句給讀屏軟體（例如「跳到內容」），那不是壞人。
export const 例外條件們 = [
  { 名: "無障礙短提示", 說: ["用裁切或零大小藏起來、短於機器字最短、又不像指令的字：是給讀屏軟體的，不算", "short, non-instruction text hidden by clipping or zero size: a screen-reader hint, not an attack"] },
];

// 子文件最多鑽幾層、最多掃幾份（防止網頁用無限套框把掃描器拖死；超過的照「看不進去的框」列出來）
export const 子文件上限 = { 層: 3, 份: 20 };

// 掃描模式：
//   跑程式（預設）：本站的程式會跑，才看得到用程式長出來的東西（例如影子元件）；外來網站的東西一律不載入，
//                  本站也只准讀（GET），任何寫入（POST 等）都擋下並列出來。
//   不跑程式：完全不執行網頁程式，只看原本的結構；用程式長出來的東西就看不到。
export const 掃描模式們 = ["跑程式", "不跑程式"];

// 只給機器看的字，短於這個長度不算（像「關閉」「選單」這種按鈕名字）
export const 機器字最短 = 30;

export function 定格(發現) {
  const 規 = 規則們.find((r) => r.碼 === 發現.碼);
  if (!規) return "拒";
  if (規.種 === "流向") return 規.格;
  const 格 = 像指令.test(發現.內容 || "") ? "拒" : "黃";
  // 上限：看不準的規則（例如背景是圖片）最多判到這一格，寧可提醒、不要誤擋
  return 規.上限 && 格們.indexOf(格) > 格們.indexOf(規.上限) ? 規.上限 : 格;
}

export function 判側面(發現們) {
  const 帶格 = 發現們.map((f) => ({ ...f, 格: 定格(f) }));
  const 決定 = 帶格.reduce((a, f) => (格們.indexOf(f.格) > 格們.indexOf(a) ? f.格 : a), "綠");
  return { 決定, 發現們: 帶格 };
}

// 法典自我檢查：碼不重複、流向一定有格、格都在尺上、例外都有說明
export function 檢查側面法典() {
  const 問題 = [], 碼們 = 規則們.map((r) => r.碼);
  if (new Set(碼們).size !== 碼們.length) 問題.push("規則的碼重複");
  for (const r of 規則們) {
    if (!["字", "流向"].includes(r.種)) 問題.push(`${r.碼}：種只能是字或流向`);
    if (r.種 === "流向" && !格們.includes(r.格)) 問題.push(`${r.碼}：流向一定要寫格，而且要在尺上`);
    if (r.說?.length !== 2) 問題.push(`${r.碼}：說明要有中文和英文`);
    if (r.上限 && !格們.includes(r.上限)) 問題.push(`${r.碼}：上限要在尺上`);
  }
  for (const e of 例外們) if (!e.選 || e.說?.length !== 2) 問題.push("例外要有選擇器和中英說明");
  const 處們 = 掃描範圍.map((x) => x.處);
  if (new Set(處們).size !== 處們.length) 問題.push("掃描範圍重複");
  for (const x of 掃描範圍) if (x.說?.length !== 2) 問題.push(`${x.處}：說明要有中文和英文`);
  for (const x of 例外條件們) if (!x.名 || x.說?.length !== 2) 問題.push("例外條件要有名字和中英說明");
  return 問題;
}
