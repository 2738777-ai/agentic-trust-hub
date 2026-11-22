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
  { 碼: "推到畫面外", 說: ["位置在畫面外面", "positioned off screen"], 種: "字" },
  { 碼: "隱形字", 說: ["含人眼看不到的字元", "contains invisible characters"], 種: "字" },
  { 碼: "只給機器看", 說: ["藏在標籤、標題、替代文字裡", "hidden in a label, title or alt text"], 種: "字" },
  { 碼: "資料送別家", 說: ["表單送到別的網站", "a form posts to another site"], 種: "流向", 格: "拒" },
  { 碼: "外來程式", 說: ["載入別的網站的程式", "loads a script from another site"], 種: "流向", 格: "待審" },
];

// 例外：人點一下就看得到的，不算藏字（不然會自體免疫，把正常網頁當壞人；2026-11-22 實測下拉選單誤報）
export const 例外們 = [
  { 選: "option", 說: ["下拉選單的選項，點開就看得到", "drop-down options, visible when opened"] },
  { 選: "details:not([open]) > :not(summary)", 說: ["折起來的說明，點開就看得到", "collapsed details, visible when opened"] },
];

// 只給機器看的字，短於這個長度不算（像「關閉」「選單」這種按鈕名字）
export const 機器字最短 = 30;

export function 定格(發現) {
  const 規 = 規則們.find((r) => r.碼 === 發現.碼);
  if (!規) return "拒";
  if (規.種 === "流向") return 規.格;
  return 像指令.test(發現.內容 || "") ? "拒" : "黃";
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
  }
  for (const e of 例外們) if (!e.選 || e.說?.length !== 2) 問題.push("例外要有選擇器和中英說明");
  return 問題;
}
