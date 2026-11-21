// 視角引擎：做一份執行紀錄 → 照視角法典只把登記的欄位交給視角 → 視角算出畫面要的資料 → 守衛確認決定沒被換掉。
// 瀏覽器和命令列共用。畫圖在 web/視角台.mjs，這裡只算資料，所以可以在命令列測。
import { 視角表, 紀錄欄位們, 工具看的檔, 檢查視角法典 } from "./視角法典.mjs";
import { 判定 } from "./翻譯器.mjs";
import { 全部檢查 } from "./工具.mjs";
import { 泡泡池 } from "./泡泡.mjs";

export class 視角錯誤 extends Error {}
export const 檔種類們 = ["代理網路描述檔", "網站描述檔", "簽章檔"];
const 隱形字 = /[​-‏⁠﻿]/g;

// ---------- 找改動：和正常版本逐欄比對，字串只抓出被插進去／刪掉的那一段 ----------
function 比(前, 後, 路徑, 出) {
  const 是物件 = (x) => x !== null && typeof x === "object";
  if (是物件(前) && 是物件(後) && Array.isArray(前) === Array.isArray(後)) {
    for (const k of new Set([...Object.keys(前), ...Object.keys(後)]))
      比(前[k], 後[k], Array.isArray(前) ? `${路徑}[${k}]` : 路徑 ? `${路徑}.${k}` : k, 出);
    return;
  }
  if (JSON.stringify(前) === JSON.stringify(後)) return;
  const 改 = { 路徑, 前: 前 ?? null, 後: 後 ?? null };
  if (typeof 前 === "string" && typeof 後 === "string") {
    let i = 0; while (i < 前.length && i < 後.length && 前[i] === 後[i]) i++;
    let j = 0; while (j < 前.length - i && j < 後.length - i && 前.at(-1 - j) === 後.at(-1 - j)) j++;
    改.開頭 = i; 改.插入 = 後.slice(i, 後.length - j); 改.刪掉 = 前.slice(i, 前.length - j);
    改.隱形字數 = (改.插入.match(隱形字) || []).length;
  }
  出.push(改);
}
export function 找改動(基準們, 現在們) {
  const 改動們 = [];
  for (const 檔 of 檔種類們) {
    const a = 基準們[檔], b = 現在們[檔];
    if (a == null && b == null) continue;
    if (b == null) { 改動們.push({ 檔, 狀態: "缺檔", 細: [] }); continue; }
    if (a == null) { 改動們.push({ 檔, 狀態: "多出來", 細: [] }); continue; }
    const 細 = []; 比(JSON.parse(a), JSON.parse(b), "", 細);
    if (細.length) 改動們.push({ 檔, 狀態: "改了", 細 });
  }
  return 改動們;
}

// ---------- 做紀錄：跑一次兩個工具、法典判定、泡泡串鏈，全部視角共用這一份 ----------
// 讀(檔名) 回傳文字或 null；讀基準 同上（正常版本 A）；工具環境 交給 全部檢查
export async function 做紀錄({ 版本名, 網路檔名, 讀, 讀基準, 工具環境, 法 }) {
  const 檔名 = { 代理網路描述檔: 網路檔名, 網站描述檔: "agent-manifest.json", 簽章檔: "agent-facts.signed.json" };
  const 現在們 = {}, 基準們 = {};
  for (const 檔 of 檔種類們) { 現在們[檔] = await 讀(檔名[檔]); 基準們[檔] = await 讀基準(檔名[檔]); }
  const { 結果們 } = await 全部檢查(工具環境);
  const { 決定, 理由: 理由們 } = 判定(法, 結果們);

  const 池 = new 泡泡池(), 來源 = `examples/${版本名}/`;
  const 根 = await 池.包({ 種類: "代理網路描述檔", 來源: 來源 + 檔名.代理網路描述檔, 內容: 現在們.代理網路描述檔 });
  await 池.包({ 種類: "網站描述檔", 來源: 來源 + 檔名.網站描述檔, 內容: 現在們.網站描述檔 }, 根.編號);
  const 章檔 = 現在們.簽章檔 != null ? await 池.包({ 種類: "簽章檔", 來源: 來源 + 檔名.簽章檔, 內容: 現在們.簽章檔 }, 根.編號) : null;
  const 格 = (器) => 理由們.find((r) => r.器 === 器);
  const 門 = 格("進門檢查（Agent Customs）"), 真 = 格("真偽檢查（NandaSeal）");
  await 池.蓋章(根.編號, { 器: "進門檢查", 代碼: 門.代碼, 格: 門.格 });
  await 池.蓋章((章檔 || 根).編號, { 器: "真偽檢查", 代碼: 真.代碼, 格: 真.格 });
  await 池.判定(根.編號, 決定);
  if (決定 === 法.尺.at(-1)) await 池.剪斷(根.編號, "法典判拒");

  return { 版本名, 尺: [...法.尺], 改動們: 找改動(基準們, 現在們), 結果們, 理由們, 決定,
    泡泡們: 池.泡泡們, 總歷程: 池.總歷程, 總鏈: 池.總鏈 };
}

// ---------- 投影：只交出表上登記的欄位（深拷貝＋凍結，視角改不到原紀錄，也偷看不到別的欄位） ----------
const 凍 = (x) => { if (x && typeof x === "object") { Object.values(x).forEach(凍); Object.freeze(x); } return x; };
export function 投影(紀錄, 欄位們) {
  const 出 = { 尺: [...紀錄.尺] };   // 尺是法典本身，每個視角都能看
  for (const f of 欄位們) { if (!紀錄欄位們.includes(f)) throw new 視角錯誤(`沒有這個欄位：${f}`); 出[f] = JSON.parse(JSON.stringify(紀錄[f])); }
  return 凍(出);
}

// 一個工具面對這次的改動，是「抓到」「被騙」「起疑」還是「沒事」
export function 工具狀態(器, 格, 改動們, 尺) {
  const 看到改動 = (工具看的檔[器] || []).some((檔) => 改動們.some((c) => c.檔 === 檔));
  if (看到改動) return { 看到改動, 狀態: 格 === 尺.at(-1) ? "抓到" : 格 === 尺[0] ? "被騙" : "起疑" };
  return { 看到改動, 狀態: 格 === 尺[0] ? "沒事" : "起疑" };
}

// ---------- 四個視角：只算資料，不碰畫面 ----------
export const 視角模型 = {
  駭客(投) {
    const 工具們 = 投.理由們.map((r) => ({ 器: r.器, 代碼: r.代碼, 格: r.格, ...工具狀態(r.器, r.格, 投.改動們, 投.尺) }));
    return { 版本名: 投.版本名, 決定: 投.決定, 改動們: 投.改動們, 工具們,
      被騙的: 工具們.filter((t) => t.狀態 === "被騙").map((t) => t.器) };
  },
  地圖(投) {
    const 改了 = Object.fromEntries(檔種類們.map((檔) => [檔, 投.改動們.find((c) => c.檔 === 檔)?.狀態 ?? null]));
    const 檔節點 = 檔種類們.map((檔) => ({ id: 檔, 類: "檔", 改: 改了[檔] }));
    const 器節點 = 投.理由們.map((r) => ({ id: r.器, 類: "器", 格: r.格, 代碼: r.代碼, ...工具狀態(r.器, r.格, 投.改動們, 投.尺) }));
    const 邊們 = [];
    for (const r of 投.理由們) for (const 檔 of 工具看的檔[r.器] || []) 邊們.push({ 從: 檔, 到: r.器, 帶毒: Boolean(改了[檔]) });
    for (const r of 投.理由們) 邊們.push({ 從: r.器, 到: "法典", 格: r.格 });
    邊們.push({ 從: "法典", 到: "出口", 格: 投.決定 });
    return { 版本名: 投.版本名, 決定: 投.決定, 節點們: [...檔節點, ...器節點, { id: "法典", 類: "法典", 格: 投.決定 }, { id: "出口", 類: "出口", 格: 投.決定 }], 邊們 };
  },
  矩陣(投們) {
    const 列們 = 投們.map((投) => {
      const 有手腳 = 投.改動們.length > 0;
      const 格們 = 投.理由們.map((r) => ({ 器: r.器, 格: r.格, ...工具狀態(r.器, r.格, 投.改動們, 投.尺),
        單靠會放過: 有手腳 && r.格 === 投.尺[0] }));
      return { 版本名: 投.版本名, 有手腳, 格們, 決定: 投.決定, 合起來擋下: 有手腳 && 投.決定 !== 投.尺[0] };
    });
    return { 列們, 決定們: 列們.map((r) => r.決定) };
  },
  時間(投) {
    // 照總歷程的順序，替每顆泡泡的每一件事編上全域序號；子泡泡的扣環對到父泡泡的哪一件事
    const 序 = {}; const 計 = {};
    投.總歷程.forEach((h, n) => { const k = (計[h.編號] = (計[h.編號] ?? -1) + 1); 序[`${h.編號}|${k}`] = n + 1; });
    const 泡道們 = 投.泡泡們.map((p) => ({ 編號: p.編號, 種類: p.種類, 父編號: p.父編號, 狀態: p.狀態,
      事件們: p.歷程.map((h, i) => ({ 序: 序[`${p.編號}|${i}`], 事件: h.事件, 鏈: h.鏈, 格: h.格 ?? h.決定 ?? null })) }));
    const 扣環們 = 投.泡泡們.filter((p) => p.父編號).map((p) => {
      const 父 = 投.泡泡們.find((q) => q.編號 === p.父編號), 接自 = p.歷程[0].接自;
      const i = 父.歷程.findIndex((h) => h.鏈 === 接自);
      return { 子: p.編號, 父: p.父編號, 父序: 序[`${父.編號}|${i}`], 子序: 序[`${p.編號}|0`], 接自 };
    });
    return { 版本名: 投.版本名, 決定: 投.決定, 泡道們, 扣環們, 總鏈: 投.總鏈, 件數: 投.總歷程.length };
  },
};

// ---------- 看：照表投影 → 算 → 守衛（決定一定要和紀錄一樣） ----------
export function 看(名, 紀錄或紀錄們, { 表 = 視角表, 模型們 = 視角模型 } = {}) {
  const 問題 = 檢查視角法典(表);
  if (問題.length) throw new 視角錯誤("視角法典有問題：" + 問題.join("；"));
  const 條 = 表.find((v) => v.名 === 名);
  if (!條) throw new 視角錯誤(`法典沒有這個視角：${名}`);
  const 紀錄們 = [].concat(紀錄或紀錄們);
  if (條.範圍 === "一份" && 紀錄們.length !== 1) throw new 視角錯誤(`${名} 一次只看一份紀錄`);
  const 投們 = 紀錄們.map((r) => 投影(r, 條.讀));
  const 模 = 模型們[名](條.範圍 === "一份" ? 投們[0] : 投們);
  const 應該 = 紀錄們.map((r) => r.決定), 實際 = 條.範圍 === "一份" ? [模?.決定] : 模?.決定們 ?? [];
  if (JSON.stringify(應該) !== JSON.stringify(實際))
    throw new 視角錯誤(`${名} 視角換了事實：紀錄的決定是 ${應該.join("、")}，視角卻顯示 ${實際.join("、")}`);
  return 模;
}
