// 全部測試：node tests/全部.mjs
// 1 法典窮舉 2 翻譯器四種錯一定停 3 五個示範版本的預期決定（真的叫兩個工具跑）
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { 翻譯, 窮舉檢查, 法典錯誤 } from "../core/翻譯器.mjs";

const 根 = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
let 過 = 0, 錯 = 0;
const 驗 = (條件, 名) => { 條件 ? 過++ : 錯++; console.log((條件 ? "通過 " : "失敗 ") + 名); };
const 會停 = (文字, 名) => { try { 翻譯(文字); 驗(false, `${名}（竟然沒停）`); } catch (e) { 驗(e instanceof 法典錯誤, `${名}：${e.message}`); } };

const 原文 = await readFile(path.join(根, "core", "法典.txt"), "utf8");
const r = 窮舉檢查(翻譯(原文));
驗(r.違反.length === 0 && r.組合數 > 0, `法典窮舉 ${r.組合數} 種組合，違反 ${r.違反.length} 次`);

會停(原文 + "\n假如對方很可疑就擋\n", "看不懂的句子會停");
會停(原文 + "\n進門檢查（Agent Customs）說 DENIED → 綠\n", "前後矛盾會停");
會停(原文.replace("說 HOLD → 待審", "說 HOLD → 很危險"), "尺上沒有的格會停");
會停(原文.replace("讀不到結果：拒", "讀不到結果：綠"), "讀不到結果不是最嚴會停");
會停(原文.replace("合成：最壞的贏", "合成：投票"), "不認得的合成方式會停");

const 預期 = { A_normal: "綠", B_injected: "拒", C_self_signed: "拒", D_steps_changed: "拒", E_unsigned: "黃" };
for (const [版, 答] of Object.entries(預期)) {
  const 出 = execFileSync(process.execPath, [path.join(根, "cli", "插座.mjs"), "檢查", path.join(根, "examples", 版)], { encoding: "utf8" });
  const 決定 = (出.match(/決定：(\S+)/) || [])[1];
  驗(決定 === 答, `示範 ${版}：預期 ${答}，實際 ${決定}`);
}
// 4 泡泡（因果鏈）測試
try { execFileSync(process.execPath, [path.join(根, "tests", "泡泡.mjs")], { encoding: "utf8" }); 驗(true, "泡泡測試全部通過（node tests/泡泡.mjs）"); }
catch (e) { 驗(false, "泡泡測試有失敗：\n" + e.stdout); }

// 5 英文法典：和中文法典翻出來的表一模一樣（連行號都一樣），窮舉每一種組合決定也一樣
import { 判定 } from "../core/翻譯器.mjs";
const 英文 = await readFile(path.join(根, "core", "法典.en.txt"), "utf8");
const 中法 = 翻譯(原文), 英法 = 翻譯(英文);
驗(JSON.stringify(中法) === JSON.stringify(英法), "英文法典和中文法典翻出來的表完全一樣");
{
  const 器們 = Object.keys(中法.轉接); let 數 = 0, 不同 = 0;
  const 走 = (i, 組) => { if (i === 器們.length) { 數++; if (判定(中法, 組).決定 !== 判定(英法, 組).決定) 不同++; return; }
    for (const 碼 of [...Object.keys(中法.轉接[器們[i]]), "沒見過的代碼"]) 走(i + 1, { ...組, [器們[i]]: 碼 }); };
  走(0, {});
  驗(不同 === 0 && 數 > 0, `中英法典窮舉 ${數} 種組合，決定不同 ${不同} 次`);
}
const 英會停 = (文字, 名) => { try { 翻譯(文字); 驗(false, `${名}（竟然沒停）`); } catch (e) { 驗(e instanceof 法典錯誤 && /Line|scale|unreadable|combine/.test(e.英文), `${名}：${e.英文}`); } };
英會停(英文 + "\nblock it if it looks shady\n", "英文：看不懂的句子會停");
英會停(英文 + "\nAgent Customs says DENIED → GREEN\n", "英文：前後矛盾會停");
英會停(英文.replace("says HOLD → REVIEW", "says HOLD → SCARY"), "英文：尺上沒有的格會停");
英會停(英文.replace("unreadable: DENY", "unreadable: GREEN"), "英文：讀不到結果不是最嚴會停");

// 6 網頁用的核心包是不是最新的：重新打包一次，和倉庫裡的比對（沒裝 esbuild 就跳過）
try {
  const { mkdtempSync } = await import("node:fs"); const os = await import("node:os");
  const 暫 = path.join(mkdtempSync(path.join(os.tmpdir(), "包_")), "核心包.js");
  execFileSync(process.execPath, [path.join(根, "tools", "打包.mjs"), 暫], { encoding: "utf8", stdio: "pipe" });
  const [新包, 舊包] = await Promise.all([readFile(暫, "utf8"), readFile(path.join(根, "web", "核心包.js"), "utf8")]);
  驗(新包 === 舊包, "網頁核心包是最新的（不是的話：node tools/打包.mjs）");
} catch (e) { console.log("跳過 核心包比對（沒裝 esbuild？" + String(e.message).slice(0, 60) + "）"); }
console.log(`\n合計：${過}/${過 + 錯} 通過`);
process.exit(錯 ? 1 : 0);
