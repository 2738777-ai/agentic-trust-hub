#!/usr/bin/env node
// 萬用插座 命令列。人說人話，AI 翻成這裡的命令；放不放行由白話法典決定，程式只照法典走。
//   node cli/插座.mjs 法典                          檢查白話法典，窮舉所有組合
//   node cli/插座.mjs 檢查 <網站資料夾> [代理網路名]   讓接上的檢查工具各看一次，照法典合成一個決定
//   node cli/插座.mjs 視角 <網站資料夾> [視角名]       同一次檢查換角度看（駭客、地圖、時間）
import { readFile } from "node:fs/promises";
import path from "node:path";
import { 翻譯, 判定, 窮舉檢查 } from "../core/翻譯器.mjs";
import { 全部檢查 } from "../core/工具.mjs";
import { 假網址, 資料夾fetch, 紀錄材料 } from "./資料夾.mjs";
import { 做紀錄, 看 } from "../core/視角.mjs";
import { 視角表 } from "../core/視角法典.mjs";

const 根 = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const [指令, 目標, 網名 = "tidewhistle_guesthouse"] = process.argv.slice(2);
try {
  const 法 = 翻譯(await readFile(path.join(根, "core", "法典.txt"), "utf8"));
  if (指令 === "法典") {
    const r = 窮舉檢查(法);
    console.log(`法典沒問題：${r.工具數} 個檢查工具、${r.規則數} 條規則，窮舉 ${r.組合數} 種組合，違反 ${r.違反.length} 次`);
    if (r.違反.length) process.exitCode = 1;
  } else if (指令 === "檢查" && 目標) {
    const 資料夾 = path.resolve(目標), 網路檔名 = `${網名}.network.json`;
    const { 結果們 } = await 全部檢查({
      網路網址: `${假網址}/${網名}`, fetchImpl: 資料夾fetch(資料夾), pageOrigin: "https://hub.local",
      讀JSON: async (f) => JSON.parse(await readFile(path.join(資料夾, f), "utf8")), 網路檔名,
    });
    const { 決定, 理由 } = 判定(法, 結果們);
    for (const r of 理由) console.log(`  ${r.器}：${r.代碼} → ${r.格}${r.行 ? `（法典第 ${r.行} 行）` : "（法典沒寫，當讀不到）"}`);
    console.log(`決定：${決定}`);
  } else if (指令 === "視角" && 目標) {
    // 同一次檢查換角度看：node cli/插座.mjs 視角 examples/C_self_signed 駭客
    const 名 = process.argv[4] || "駭客";
    const 紀錄 = await 做紀錄({ ...紀錄材料(path.resolve(目標)), 法 });
    const 條 = 視角表.find((v) => v.名 === 名);
    if (條?.範圍 === "全部") throw new Error(`${名} 視角要看全部版本，請用網頁的視角台`);
    console.log(`【${名}視角】${條 ? 條.問題[0] : ""}`);
    console.log(JSON.stringify(看(名, 紀錄), null, 2));
  } else {
    console.log("用法：node cli/插座.mjs 法典｜node cli/插座.mjs 檢查 <網站資料夾> [代理網路名]｜node cli/插座.mjs 視角 <網站資料夾> [駭客|地圖|時間]");
    process.exitCode = 2;
  }
} catch (e) { console.error("停止：" + e.message); process.exitCode = 1; }
