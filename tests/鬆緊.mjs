// 鬆緊測試：node tests/鬆緊.mjs
// 紅隊第 1 招「騙人把拒改成綠」：翻譯器、窮舉都照收，只有鬆緊比對抓得到。這裡證明它抓得到、也不亂抓。
import { readFile } from "node:fs/promises";
import path from "node:path";
import { 翻譯, 窮舉檢查, 判定 } from "../core/翻譯器.mjs";
import { 比鬆緊 } from "../core/鬆緊.mjs";

const 根 = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
let 過 = 0, 錯 = 0;
const 驗 = (c, 名) => { c ? 過++ : 錯++; console.log((c ? "通過 " : "失敗 ") + 名); };
const 原文 = await readFile(path.join(根, "core", "法典.txt"), "utf8");
const 英文 = await readFile(path.join(根, "core", "法典.en.txt"), "utf8");
const 舊 = 翻譯(原文);

// 先證明洞是真的：放鬆的法典能通過原本所有檢查
const 壞 = 翻譯(原文.replace("DENIED → 拒", "DENIED → 綠"));
驗(窮舉檢查(壞).違反.length === 0, "紅隊第 1 招：放鬆的法典能通過翻譯和窮舉（洞是真的）");
驗(判定(壞, { "進門檢查（Agent Customs）": "DENIED", "真偽檢查（NandaSeal）": "VERIFIED" }).決定 === "綠", "紅隊第 1 招：Ｃ版本被放成「綠」");

// 補丁：鬆緊比對抓得到
const r1 = 比鬆緊(舊, 壞);
驗(r1.放鬆.length === 3 && r1.收緊.length === 0, `抓到放鬆 ${r1.放鬆.length} 格（DENIED 配三種簽章結果）`);
驗(r1.放鬆.every((x) => x.組["進門檢查（Agent Customs）"] === "DENIED"), "放鬆的格子全是 DENIED 那一行造成的");
// 不亂抓：收緊、沒改、中英互換都沒有放鬆
const r2 = 比鬆緊(舊, 翻譯(原文.replace("CONDITIONS → 黃", "CONDITIONS → 待審")));
驗(r2.放鬆.length === 0 && r2.收緊.length === 2, "改嚴：放鬆 0 格、收緊 2 格，可以直接生效");
const r3 = 比鬆緊(舊, 翻譯(原文));
驗(r3.放鬆.length === 0 && r3.收緊.length === 0 && r3.組合數 === 42, "沒改：42 種組合，全部一樣");
const r4 = 比鬆緊(舊, 翻譯(英文));
驗(r4.放鬆.length === 0 && r4.收緊.length === 0, "換成英文法典：一格都沒變");
// 刪一行也是放鬆嗎？刪掉 DENIED 那行，DENIED 變成「沒見過」→ 照讀不到當拒，不算放鬆
const r5 = 比鬆緊(舊, 翻譯(原文.replace(/^.*DENIED → 拒.*$/m, "")));
驗(r5.放鬆.length === 0, "刪掉一行：沒寫到的照讀不到當拒，不會變鬆（空隙灌成水泥）");
// 多接一個工具，新工具沒見過的代碼要當拒，不能讓舊組合變鬆
const r6 = 比鬆緊(舊, 翻譯(原文 + "\n新工具說 OK → 綠\n"));
驗(r6.放鬆.length === 0, "多接一個新工具：舊的組合一格都沒有變鬆");
// 偷偷把尺改短（拒變最嚴的下一格以外）：讀不到結果還是最嚴，換尺後同樣情況不能變鬆
const r7 = 比鬆緊(舊, 翻譯(原文.replace("尺：綠 < 黃 < 待審 < 拒", "尺：綠 < 黃 < 待審 < 拒 < 封鎖").replace("讀不到結果：拒", "讀不到結果：封鎖")));
驗(r7.放鬆.length > 0, `把尺拉長、讓「拒」不再是最嚴：抓到 ${r7.放鬆.length} 格放鬆（拒的地位被稀釋）`);

// 拔掉一個檢查工具 = 少一道檢查，必須抓成放鬆
const 沒真偽 = 原文.split("\n").filter((l) => !l.startsWith("真偽檢查")).join("\n");
const r8 = 比鬆緊(舊, 翻譯(沒真偽));
驗(r8.放鬆.length > 0, `拔掉真偽檢查：抓到 ${r8.放鬆.length} 格放鬆（少了一道關卡）`);

console.log(`\n合計：${過}/${過 + 錯} 通過`);
process.exit(錯 ? 1 : 0);
