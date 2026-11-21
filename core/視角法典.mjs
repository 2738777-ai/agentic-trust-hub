// 視角法典：同一次檢查，換不同角度看。先寫表，引擎只照表走。
// 最高規矩：換視角不換事實。每個視角只拿得到表上登記的欄位（引擎真的只交這些），而且都必須顯示同一個決定。

// 一次執行紀錄有哪些欄位（由 core/視角.mjs 的「做紀錄」產生，全部視角共用這一份）
export const 紀錄欄位們 = ["版本名", "改動們", "結果們", "理由們", "決定", "泡泡們", "總歷程", "總鏈"];

// 每個工具讀哪些檔：用來判斷「駭客改的檔，這個工具有沒有看到」
export const 工具看的檔 = {
  "進門檢查（Agent Customs）": ["代理網路描述檔"],
  "真偽檢查（NandaSeal）": ["代理網路描述檔", "網站描述檔", "簽章檔"],
};

// 視角表：名字、回答什麼問題、只准讀哪些欄位、一次看一份紀錄還是全部
export const 視角表 = [
  { 名: "駭客", 問題: ["駭客動了哪裡？哪個工具看到、哪個被騙？", "What did the attacker change? Which checker saw it, which was fooled?"],
    讀: ["版本名", "改動們", "理由們", "決定"], 範圍: "一份" },
  { 名: "地圖", 問題: ["訊號走哪條路？在哪裡被攔下？", "Which path does each signal take, and where is it stopped?"],
    讀: ["版本名", "改動們", "理由們", "決定"], 範圍: "一份" },
  { 名: "矩陣", 問題: ["每個版本，只靠一個工具會不會放過？", "For each version: would a single checker have let it through?"],
    讀: ["版本名", "改動們", "理由們", "決定"], 範圍: "全部" },
  { 名: "時間", 問題: ["事情照什麼順序發生？因果怎麼扣在一起？", "In what order did things happen, and how are causes buckled together?"],
    讀: ["版本名", "泡泡們", "總歷程", "總鏈", "決定"], 範圍: "一份" },
];

// 檢查器：表寫壞就抓出來（測試會故意寫壞來咬它）
export function 檢查視角法典(表 = 視角表) {
  const 問題 = [];
  const 名們 = 表.map((v) => v.名);
  if (表.length < 2) 問題.push("至少要兩個視角，才叫換視角");
  if (new Set(名們).size !== 名們.length) 問題.push("視角名字重複");
  for (const v of 表) {
    if (!v.讀.includes("決定")) 問題.push(`${v.名}：沒讀「決定」，畫面會看不到結論`);
    if (!v.讀.includes("版本名")) 問題.push(`${v.名}：沒讀「版本名」，看不出是哪個版本`);
    for (const f of v.讀) if (!紀錄欄位們.includes(f)) 問題.push(`${v.名}：讀了紀錄裡沒有的欄位「${f}」`);
    if (!["一份", "全部"].includes(v.範圍)) 問題.push(`${v.名}：範圍只能是「一份」或「全部」`);
    if (!Array.isArray(v.問題) || v.問題.length !== 2) 問題.push(`${v.名}：問題要有中文和英文`);
  }
  return 問題;
}
