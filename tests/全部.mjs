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
console.log(`\n合計：${過}/${過 + 錯} 通過`);
process.exit(錯 ? 1 : 0);
