// 視角測試：node tests/視角.mjs
// 最高規矩「換視角不換事實」：5 個版本 × 每個視角，決定都要和命令列一樣；寫壞的法典、偷換決定的視角、偷看欄位的視角都要被抓。
import { readFile } from "node:fs/promises";
import path from "node:path";
import { 翻譯 } from "../core/翻譯器.mjs";
import { 視角表, 檢查視角法典 } from "../core/視角法典.mjs";
import { 做紀錄, 看, 視角模型, 視角錯誤, 投影 } from "../core/視角.mjs";
import { 紀錄材料 } from "../cli/資料夾.mjs";

const 根 = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
let 過 = 0, 錯 = 0;
const 驗 = (c, 名) => { c ? 過++ : 錯++; console.log((c ? "通過 " : "失敗 ") + 名); };
const 會停 = (f, 名) => { try { f(); 驗(false, 名 + "（竟然沒停）"); } catch (e) { 驗(e instanceof 視角錯誤, `${名}：${e.message}`); } };

驗(檢查視角法典().length === 0, "視角法典窮舉：0 個問題");
// 咬人：故意寫壞法典
驗(檢查視角法典([...視角表, { ...視角表[0] }]).length > 0, "咬人：視角名字重複會被抓");
驗(檢查視角法典(視角表.map((v, i) => (i ? v : { ...v, 讀: v.讀.filter((f) => f !== "決定") }))).length > 0, "咬人：視角沒讀決定會被抓");
驗(檢查視角法典(視角表.map((v, i) => (i ? v : { ...v, 讀: [...v.讀, "私鑰"] }))).length > 0, "咬人：讀紀錄裡沒有的欄位會被抓");
驗(檢查視角法典([視角表[0]]).length > 0, "咬人：只有一個視角會被抓");

const 法 = 翻譯(await readFile(path.join(根, "core", "法典.txt"), "utf8"));
const 預期 = { A_normal: "綠", B_injected: "拒", C_self_signed: "拒", D_steps_changed: "拒", E_unsigned: "黃" };
const 紀錄們 = [];
for (const 版 of Object.keys(預期)) 紀錄們.push(await 做紀錄({ ...紀錄材料(path.join(根, "examples", 版)), 法 }));

// 換視角不換事實
for (const r of 紀錄們) for (const v of 視角表.filter((v) => v.範圍 === "一份"))
  驗(看(v.名, r).決定 === 預期[r.版本名], `${r.版本名} × ${v.名}視角：${預期[r.版本名]}`);
const 矩 = 看("矩陣", 紀錄們);
驗(JSON.stringify(矩.決定們) === JSON.stringify(Object.values(預期)), `矩陣視角 5 列決定和命令列一樣：${矩.決定們.join("")}`);

// 駭客視角：看得出駭客動了什麼
const 駭 = Object.fromEntries(紀錄們.map((r) => [r.版本名, 看("駭客", r)]));
驗(駭.A_normal.改動們.length === 0, "Ａ 正常：沒有改動");
for (const 版 of ["B_injected", "C_self_signed"]) {
  const 插 = 駭[版].改動們.find((c) => c.檔 === "代理網路描述檔").細[0];
  驗(插.隱形字數 >= 2 && /SYSTEM NOTE/.test(插.插入), `${版}：抓出藏在 ${插.隱形字數} 個隱形字後面的壞指令`);
}
驗(JSON.stringify(駭.C_self_signed.被騙的) === JSON.stringify(["真偽檢查（NandaSeal）"]), "Ｃ：被騙的是真偽檢查（簽章是真的）");
驗(駭.B_injected.被騙的.length === 0, "Ｂ：沒有工具被騙");
const 步 = 駭.D_steps_changed.改動們[0].細[0];
驗(/max_steps$/.test(步.路徑) && 步.前 === 12 && 步.後 === 500, `Ｄ：抓出 ${步.路徑} 從 12 改成 500`);
驗(駭.E_unsigned.改動們.some((c) => c.檔 === "簽章檔" && c.狀態 === "缺檔"), "Ｅ：簽章檔缺檔");

// 矩陣：只靠一個工具會放過的格子
const 列 = Object.fromEntries(矩.列們.map((r) => [r.版本名, r]));
驗(列.C_self_signed.格們.find((g) => g.器.includes("NandaSeal")).單靠會放過 && 列.C_self_signed.合起來擋下, "矩陣：Ｃ 單靠真偽檢查會放過，合起來擋下");
驗(列.D_steps_changed.格們.find((g) => g.器.includes("Customs")).狀態 === "起疑", "矩陣：Ｄ 進門檢查只是起疑（待審）");
驗(!列.A_normal.有手腳 && !列.A_normal.格們.some((g) => g.單靠會放過), "矩陣：Ａ 沒有手腳，沒有誤報");

// 時間：序號 1..N 不重複；每個扣環都是父先子後
for (const r of 紀錄們) {
  const 時 = 看("時間", r);
  const 序們 = 時.泡道們.flatMap((d) => d.事件們.map((e) => e.序)).sort((a, b) => a - b);
  const 連號 = 序們.length === 時.件數 && 序們.every((s, i) => s === i + 1);
  驗(連號 && 時.扣環們.every((k) => k.父序 < k.子序), `${r.版本名} 時間視角：${時.件數} 件事連號，扣環都是父先子後`);
}

// 守衛咬人：偷換決定的視角、範圍不對、偷看沒登記的欄位、偷改紀錄
const 壞模型 = { ...視角模型, 駭客: (投) => ({ ...視角模型.駭客(投), 決定: "綠" }) };
會停(() => 看("駭客", 紀錄們[2], { 模型們: 壞模型 }), "咬人：視角把 Ｃ 的「拒」偷換成「綠」會停");
會停(() => 看("駭客", 紀錄們), "咬人：一份的視角塞五份紀錄會停");
const 偷看 = { ...視角模型, 地圖: (投) => ({ ...視角模型.地圖(投), 偷看到: 投.泡泡們 }) };
驗(看("地圖", 紀錄們[0], { 模型們: 偷看 }).偷看到 === undefined, "地圖視角沒登記「泡泡們」，偷看只拿到空的");
let 改得動 = true; try { 投影(紀錄們[0], ["決定"]).決定 = "綠"; } catch { 改得動 = false; }
驗(!改得動 && 紀錄們[0].決定 === "綠" && 預期.A_normal === "綠", "視角拿到的是凍結複本，改不動");
let 改得動2 = true; const 投 = 投影(紀錄們[2], ["改動們"]); try { 投.改動們[0].狀態 = "沒事"; } catch { 改得動2 = false; }
驗(!改得動2 && 紀錄們[2].改動們[0].狀態 === "改了", "連深層欄位也改不動，原紀錄沒被碰");

console.log(`\n合計：${過}/${過 + 錯} 通過`);
process.exit(錯 ? 1 : 0);
