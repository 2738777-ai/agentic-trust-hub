// 視角台：同一次檢查，換角度看。資料全部由 core/視角.mjs 的「看」交出來（照視角法典投影＋守衛），這裡只負責畫。
import { 是英文, 選, 套用, 載入核心 } from "./語言.mjs";

套用({
  $標題: ["萬用插座 視角台", "Agentic Trust Hub — Views"],
  小標: ["萬用插座 · 視角台", "Agentic Trust Hub · views"],
  標題: ["同一次檢查，換角度看駭客怎麼跑", "One check, many angles: watch how the attack runs"],
  去直播: ["直播", "Live"], 去正面: ["正面", "Front"], 去側面: ["側面", "Side"], 這裡: ["視角台", "Views"],
  選版本: ["網站版本", "Site version"], 選視角: ["視角", "View"],
  載入中: ["檢查工具下載中…", "Downloading the checkers…"],
  等: ["選一個版本。", "Pick a version."],
  規矩: ["每個視角只拿得到<b>視角法典</b>登記的欄位，而且決定一定和紀錄一樣；偷換決定的視角會被守衛擋下。換視角，不換事實。",
    "Each view only receives the fields registered in the <b>view law</b>, and must show the same decision as the record; a view that swaps the decision is stopped by the guard. Change the angle, never the facts."],
});

const $ = (id) => document.getElementById(id);
const 網名 = "tidewhistle_guesthouse";
const 動 = !matchMedia("(prefers-reduced-motion: reduce)").matches;
const 視角鍵 = { 駭客: "hacker", 地圖: "map", 矩陣: "matrix", 時間: "time" };
const 視角字 = { 駭客: ["駭客", "Attacker"], 地圖: ["地圖", "Map"], 矩陣: ["矩陣", "Matrix"], 時間: ["時間", "Timeline"] };
const 檔字 = { 代理網路描述檔: ["代理網路描述檔", "agent network file"], 網站描述檔: ["網站描述檔", "site manifest"], 簽章檔: ["簽章檔", "signature file"] };
const 器字 = { "進門檢查（Agent Customs）": ["進門檢查", "Entry check", "Agent Customs"], "真偽檢查（NandaSeal）": ["真偽檢查", "Signature check", "NandaSeal"] };
const 狀字 = { 抓到: ["抓到", "CAUGHT"], 被騙: ["被騙", "FOOLED"], 起疑: ["起疑", "SUSPECT"], 沒事: ["沒事", "CLEAN"] };
const 狀色 = { 抓到: "拒", 被騙: "黃", 起疑: "待審", 沒事: "綠" };
const 事字 = { 包: ["包", "wrap"], 蓋章: ["蓋章", "stamp"], 判定: ["判定", "judge"], 剪斷: ["剪斷", "cut"] };
const 意思 = {
  CLEARED: ["放行", "cleared"], CONDITIONS: ["有條件", "conditions"], HOLD: ["先停下來", "hold"], DENIED: ["拒絕進門", "denied"],
  INVALID: ["格式不對", "invalid"], UNREADABLE: ["讀不到", "unreadable"], VERIFIED: ["簽章是真的", "signature real"],
  MISSING_FACTS: ["沒有簽章", "no signature"], EXPIRED: ["簽章過期", "expired"], TAMPERED: ["被偷改過", "tampered"],
  INVALID_SIGNATURE: ["簽章是假的", "fake signature"], 讀不到: ["讀不到", "unreadable"],
};
const 字 = (表, k) => 選(...(表[k] || [k, k]));
const 色 = (格) => `var(--${{ 綠: "綠", 黃: "黃", 待審: "待審", 拒: "拒" }[格] || "灰"})`;
const 色值 = { 綠: "#3fb950", 黃: "#d29922", 待審: "#f0883e", 拒: "#f85149" };

let 核 = null, 目錄 = [], 紀錄們 = {}, 選版 = null, 選視 = "駭客";
const 參 = new URLSearchParams(location.search);
選視 = Object.keys(視角鍵).find((k) => 視角鍵[k] === 參.get("view")) || "駭客";

const 新 = (tag, cls, 文) => { const e = document.createElement(tag); if (cls) e.className = cls; if (文 != null) e.textContent = 文; return e; };
const SVG = (tag, 屬 = {}, ...子) => {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(屬)) e.setAttribute(k, v);
  for (const c of 子) e.append(c);
  return e;
};
const 格字 = (格) => (是英文 ? 核.英文格(格) : 格);
const 版名 = (名) => { const v = 目錄.find((x) => x.名 === 名); return v ? 選(v.中文名, v.英文名.replace(/\s+/g, " ")) : 名; };

// ---------- 駭客視角 ----------
function 畫駭客(模) {
  const 盒 = 新("div");
  盒.append(新("div", "標題列", 選("① 駭客動了哪裡", "① What the attacker changed")));
  if (!模.改動們.length) 盒.append(新("p", "淡", 選("和正常版本一模一樣，沒有被動過。", "Identical to the normal version. Nothing was changed.")));
  for (const 改 of 模.改動們) {
    const 卡 = 新("div", "改卡" + (改.狀態 === "缺檔" ? " 缺" : ""));
    卡.append(新("div", "檔", `${字(檔字, 改.檔)} · ${選({ 改了: "被改了", 缺檔: "整個檔不見了", 多出來: "多出來的檔" }[改.狀態], { 改了: "changed", 缺檔: "missing entirely", 多出來: "extra file" }[改.狀態])}`));
    const 放 = 改.檔 === "簽章檔" && 改.細.length > 1 ? (() => {
      const d = 新("details", "摺"); d.append(新("summary", null, 選(`整份重新簽章：${改.細.length} 個欄位都換了（看細節）`, `Re-signed: ${改.細.length} fields replaced (details)`)));
      卡.append(d); return d;
    })() : 卡;
    for (const c of 改.細) {
      放.append(新("div", "路", c.路徑));
      if (typeof c.插入 === "string") {
        const 原 = 新("div", "原文");
        const 前 = String(c.前).slice(Math.max(0, c.開頭 - 36), c.開頭);
        原.append(新("span", "前文", (c.開頭 > 36 ? "…" : "") + 前));
        if (c.刪掉) 原.append(新("del", null, c.刪掉));
        const ins = 新("ins");
        for (const ch of c.插入) {
          if (/[​-‏⁠﻿]/.test(ch)) ins.append(新("span", "隱形", 選("隱形字", "INVISIBLE")));
          else ins.append(ch);
        }
        原.append(ins); 放.append(原);
        if (c.隱形字數) 放.append(新("div", "路", 選(`↑ 紅框是 ${c.隱形字數} 個人眼看不到的字：駭客用它把壞指令藏在正常句子後面`, `↑ The red marks are ${c.隱形字數} invisible characters the attacker used to hide the injected text`)));
      } else {
        const 數 = 新("div", "數改"); 數.append(新("del", null, String(c.前)), " → ", 新("b", null, String(c.後))); 放.append(數);
      }
    }
    盒.append(卡);
  }
  盒.append(新("div", "標題列", 選("② 誰看到了", "② Who noticed")));
  const 誰 = 新("div", "誰");
  for (const t of 模.工具們) {
    const 列 = 新("div", "誰列");
    const 名 = 新("div", "名", 字(器字, t.器)); 名.append(新("small", null,
      `${器字[t.器]?.[2] ?? ""} · ${字(意思, t.代碼)} (${t.代碼}) · ${t.看到改動 ? 選("它讀的檔被動過", "reads a changed file") : 選("它讀的檔沒被動", "its files are unchanged")}`));
    const 狀 = 新("span", "狀", 字(狀字, t.狀態)); 狀.style.setProperty("--色", 色(狀色[t.狀態]));
    列.append(名, 狀); 誰.append(列);
  }
  盒.append(誰);
  const 騙 = 模.被騙的.map((器) => 字(器字, 器));
  const 結 = 新("div", "結論" + (模.決定 === "綠" ? " 好" : ""));
  結.textContent = 騙.length
    ? 選(`只靠「${騙.join("、")}」會被騙過：它讀的檔被動了，卻說沒問題。兩個合起來，最壞的贏，判「${模.決定}」。`,
      `${騙.join(", ")} alone would be fooled: its input was changed, yet it said fine. Combined, the worst wins: ${格字(模.決定)}.`)
    : 模.改動們.length
      ? 選(`沒有工具被騙。合起來判「${模.決定}」。`, `No checker was fooled. Combined: ${格字(模.決定)}.`)
      : 選("沒有改動，兩個工具都說沒問題。", "Nothing changed; both checkers are fine with it.");
  盒.append(結);
  return 盒;
}

// ---------- 地圖視角：訊號走哪條路；紅點是駭客動過的訊號 ----------
function 畫地圖(模) {
  const 位 = {
    代理網路描述檔: [60, 40], 網站描述檔: [180, 40], 簽章檔: [300, 40],
    "進門檢查（Agent Customs）": [100, 175], "真偽檢查（NandaSeal）": [262, 175], 法典: [180, 300], 出口: [180, 405],
  };
  const 半高 = { 檔: 24, 器: 30, 法典: 22, 出口: 22 };
  const 節 = Object.fromEntries(模.節點們.map((n) => [n.id, n]));
  const 底 = (id) => [位[id][0], 位[id][1] + 半高[節[id].類]], 頂 = (id) => [位[id][0], 位[id][1] - 半高[節[id].類]];
  const 曲 = (a, b) => `M${a[0]},${a[1]} C${a[0]},${(a[1] + b[1]) / 2} ${b[0]},${(a[1] + b[1]) / 2} ${b[0]},${b[1]}`;
  const 圖 = SVG("svg", { viewBox: "0 0 360 440", role: "img", "aria-label": 選("訊號路線圖", "Signal path map") });
  const 線層 = SVG("g"), 點層 = SVG("g"), 節層 = SVG("g");
  圖.append(線層, 節層, 點層);

  for (const e of 模.邊們) {
    const d = 曲(底(e.從), 頂(e.到));
    const 顏 = e.帶毒 ? "#f85149" : e.格 ? 色值[e.格] : "#3a4855";
    const 線 = SVG("path", { d, fill: "none", stroke: 顏, "stroke-width": e.帶毒 || e.格 ? 2.2 : 1.4, "stroke-opacity": e.帶毒 || e.格 ? 0.9 : 0.6 });
    if (e.帶毒) 線.setAttribute("stroke-dasharray", "6 4");
    線層.append(線);
  }
  // 紅點：從被動過的檔出發；被擋下就停在檢查站，被騙就一路溜到法典
  let 號 = 0;
  for (const e of 模.邊們.filter((x) => x.帶毒)) {
    const 器 = 節[e.到], 溜過 = 器.狀態 === "被騙";
    let d = 曲(底(e.從), 頂(e.到));
    if (溜過) d += ` L${底(e.到)[0]},${底(e.到)[1]} ` + 曲(底(e.到), 頂("法典")).replace(/^M[^C]+/, "");
    for (let k = 0; k < 2; k++) {
      const 點 = SVG("circle", { r: 4.5, fill: 溜過 ? "#d29922" : "#f85149", ...(動 ? { opacity: 0 } : {}) });   // 還沒開始跑之前先藏起來
      if (動) {
        點.append(SVG("animateMotion", { dur: 溜過 ? "3.2s" : "2s", repeatCount: "indefinite", begin: `${號 * 0.35 + k * (溜過 ? 1.6 : 1)}s`, path: d }));
        點.append(SVG("animate", { attributeName: "opacity", values: "0;1;1;0", keyTimes: "0;0.1;0.85;1", dur: 溜過 ? "3.2s" : "2s", repeatCount: "indefinite", begin: `${號 * 0.35 + k * (溜過 ? 1.6 : 1)}s` }));
      } else { const p = 頂(e.到); 點.setAttribute("cx", p[0]); 點.setAttribute("cy", p[1] - 8); }
      點層.append(點);
    }
    號++;
  }
  const 方 = (id, 寬, 高, 框色, 行們, 標) => {
    const [x, y] = 位[id];
    const g = SVG("g");
    g.append(SVG("rect", { x: x - 寬 / 2, y: y - 高 / 2, width: 寬, height: 高, rx: 7, fill: "#0e151c", stroke: 框色, "stroke-width": 1.6 }));
    行們.forEach((t, i) => g.append(SVG("text", { x, y: y - (行們.length - 1) * 7.5 + i * 15 + 4, "text-anchor": "middle", "font-size": i ? 11 : 12.5, "font-weight": i ? 400 : 700, fill: i ? "#9fb0bf" : "#e6edf3" }, t)));
    if (標) {
      const 字寬 = 標.字.length * (是英文 ? 7 : 12) + 12;
      g.append(SVG("rect", { x: x + 寬 / 2 - 字寬 + 6, y: y - 高 / 2 - 10, width: 字寬, height: 17, rx: 4, fill: 標.色 }));
      g.append(SVG("text", { x: x + 寬 / 2 - 字寬 / 2 + 6, y: y - 高 / 2 + 3, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#0b1015" }, 標.字));
    }
    節層.append(g);
  };
  for (const n of 模.節點們) {
    if (n.類 === "檔") 方(n.id, 108, 48, n.改 ? (n.改 === "缺檔" ? "#d29922" : "#f85149") : "#3a4855",
      [字(檔字, n.id).replace(/描述檔$/, 選("描述檔", "")), n.改 ? 選({ 改了: "被動過", 缺檔: "不見了", 多出來: "多出來" }[n.改], { 改了: "changed", 缺檔: "missing", 多出來: "extra" }[n.改]) : 選("沒動", "untouched")],
      n.改 === "改了" ? { 字: 選("駭", "HACK"), 色: "#f85149" } : null);
    if (n.類 === "器") 方(n.id, 150, 60, 色值[n.格], [字(器字, n.id), `${字(意思, n.代碼)} → ${格字(n.格)}`, 器字[n.id]?.[2] ?? ""],
      { 字: 字(狀字, n.狀態), 色: 色值[狀色[n.狀態]] });
    if (n.類 === "法典") 方("法典", 170, 44, 色值[n.格], [選("白話法典：最壞的贏", "Law: worst wins"), `→ ${格字(n.格)}`]);
    if (n.類 === "出口") 方("出口", 200, 44, 色值[n.格], [n.格 === "拒" ? 選("出口：整條繩剪斷", "Exit: rope cut") : n.格 === "綠" ? 選("出口：放行", "Exit: pass") : 選("出口：提醒後放行", "Exit: pass with warning")]);
  }
  const 盒 = 新("div"); 盒.append(圖);
  const 例 = 新("div", "圖例");
  const 例項 = (顏, 文, 虛) => { const s = 新("span"); const i = 新("i"); i.style.background = 虛 ? `repeating-linear-gradient(90deg, ${顏} 0 5px, transparent 5px 8px)` : 顏; s.append(i, 文); return s; };
  例.append(例項("#f85149", 選("紅點：駭客動過的訊號（被擋下就停住）", "red dots: tampered signal (stops where caught)"), true),
    例項("#d29922", 選("黃點：騙過檢查、溜到法典", "amber dots: slipped past a fooled checker")));
  盒.append(例);
  return 盒;
}

// ---------- 矩陣視角：五個版本 × 每個工具 × 合起來 ----------
function 畫矩陣(模) {
  const 器們 = 模.列們[0].格們.map((g) => g.器);
  const 表 = 新("table", "矩");
  const 頭 = 新("tr"); 頭.append(新("th", null, ""));
  for (const 器 of 器們) 頭.append(新("th", null, 選(`只靠${字(器字, 器)}`, `${字(器字, 器)} alone`)));
  頭.append(新("th", null, 選("合起來", "Combined")));
  表.append(頭);
  for (const r of 模.列們) {
    const tr = 新("tr");
    const th = 新("th", "列名", 版名(r.版本名)); th.append(新("br"), 新("small", null, r.有手腳 ? 選("有手腳", "tampered") : 選("正常", "clean")));
    th.querySelector("small").style.color = r.有手腳 ? "#f85149" : "#7d8b99";
    tr.append(th);
    for (const g of r.格們) {
      const td = 新("td", g.單靠會放過 ? "放過" : ""); td.style.setProperty("--色", 色(g.格));
      td.append(新("b", null, 格字(g.格)), 新("small", null, g.單靠會放過 ? 選("會放過！", "lets it in!") : 字(狀字, g.狀態)));
      tr.append(td);
    }
    const 合 = 新("td", "合"); 合.style.setProperty("--色", 色(r.決定)); 合.append(新("b", null, 格字(r.決定)), 新("small", null, r.決定 === "拒" ? 選("攔下", "blocked") : r.決定 !== "綠" ? 選("提醒", "warned") : r.有手腳 ? 選("放過", "passed") : 選("正常", "ok")));
    tr.append(合); 表.append(tr);
  }
  const 盒 = 新("div"); 盒.append(表);
  const 壞 = 模.列們.filter((r) => r.有手腳);
  const 漏 = 器們.map((器) => [器, 壞.filter((r) => r.格們.find((g) => g.器 === 器).單靠會放過).length]);
  const 合漏 = 壞.filter((r) => !r.合起來擋下).length;
  const 說 = 新("p", "矩說");
  說.innerHTML = 選(
    `有手腳的 <b>${壞.length}</b> 個版本裡：${漏.map(([器, n]) => `只靠${字(器字, 器)}會放過 <b>${n}</b> 個`).join("，")}；<b>合起來放過 ${合漏} 個</b>。虛線框＝只靠那個工具就會放過。`,
    `Of the <b>${壞.length}</b> tampered versions: ${漏.map(([器, n]) => `${字(器字, 器)} alone lets <b>${n}</b> in`).join(", ")}; <b>combined lets ${合漏} in</b>. Dashed cells = that checker alone would let it in.`);
  盒.append(說);
  return 盒;
}

// ---------- 時間視角：每顆泡泡一條泳道，紫線是因果扣環 ----------
function 畫時間(模) {
  const N = 模.件數, 道高 = 64, 左 = 92, 右 = 344, 上 = 34;
  const 高 = 上 + 模.泡道們.length * 道高 + 30;
  const x = (序) => (N > 1 ? 左 + ((序 - 1) * (右 - 左)) / (N - 1) : (左 + 右) / 2);
  const y = (i) => 上 + i * 道高 + 18;
  const 道號 = Object.fromEntries(模.泡道們.map((d, i) => [d.編號, i]));
  const 圖 = SVG("svg", { viewBox: `0 0 360 ${高}`, role: "img", "aria-label": 選("時間泳道圖", "Timeline swimlanes") });
  for (let s = 1; s <= N; s++) {
    圖.append(SVG("line", { x1: x(s), x2: x(s), y1: 上 - 8, y2: 高 - 26, stroke: "#1d2833", "stroke-width": 1 }));
    圖.append(SVG("text", { x: x(s), y: 上 - 14, "text-anchor": "middle", "font-size": 10, fill: "#7d8b99" }, String(s)));
  }
  圖.append(SVG("text", { x: 4, y: 上 - 14, "font-size": 10, fill: "#7d8b99" }, 選("順序 →", "order →")));
  模.泡道們.forEach((d, i) => {
    const 號 = 是英文 ? d.編號.replace("泡", "b") : d.編號;
    圖.append(SVG("text", { x: 4, y: y(i) - 2, "font-size": 12.5, "font-weight": 700, fill: "#e6edf3" }, 號));
    圖.append(SVG("text", { x: 4, y: y(i) + 13, "font-size": 10.5, fill: "#9fb0bf" }, 字(檔字, d.種類).slice(0, 是英文 ? 14 : 7)));
    const 序們 = d.事件們.map((e) => e.序);
    圖.append(SVG("line", { x1: x(Math.min(...序們)), x2: x(Math.max(...序們)), y1: y(i), y2: y(i), stroke: d.狀態 === "剪斷" ? "#6e7681" : "#58a6ff", "stroke-width": 3, "stroke-opacity": 0.55, ...(d.狀態 === "剪斷" ? { "stroke-dasharray": "2 3" } : {}) }));
  });
  for (const k of 模.扣環們) {
    const a = [x(k.父序), y(道號[k.父])], b = [x(k.子序), y(道號[k.子])];
    圖.append(SVG("path", { d: `M${a[0]},${a[1]} C${a[0]},${(a[1] + b[1]) / 2} ${b[0]},${(a[1] + b[1]) / 2} ${b[0]},${b[1]}`, fill: "none", stroke: "#bc8cff", "stroke-width": 1.8, "stroke-dasharray": "4 3" }));
  }
  模.泡道們.forEach((d, i) => {
    for (const e of d.事件們) {
      const cx = x(e.序), cy = y(i);
      const 顏 = e.事件 === "包" ? "#58a6ff" : e.事件 === "剪斷" ? "#6e7681" : 色值[e.格] || "#9fb0bf";
      if (e.事件 === "剪斷") 圖.append(SVG("rect", { x: cx - 6, y: cy - 6, width: 12, height: 12, rx: 2, fill: "#0b1015", stroke: 顏, "stroke-width": 2.4 }));
      else 圖.append(SVG("circle", { cx, cy, r: e.事件 === "判定" ? 8 : 6.5, fill: e.事件 === "判定" ? "#0b1015" : 顏, stroke: 顏, "stroke-width": e.事件 === "判定" ? 3 : 1 }));
      圖.append(SVG("text", { x: cx, y: cy + 22, "text-anchor": "middle", "font-size": 9.5, fill: "#9fb0bf" }, 字(事字, e.事件)));
    }
  });
  圖.append(SVG("text", { x: 4, y: 高 - 8, "font-size": 10.5, fill: "#9fb0bf" }, 選(`總鏈 ${模.總鏈}（${N} 件事）`, `total chain ${模.總鏈} (${N} events)`)));
  const 盒 = 新("div"); 盒.append(圖);
  const 例 = 新("div", "圖例");
  const 項 = (顏, 文, 虛) => { const s = 新("span"); const i = 新("i"); i.style.background = 虛 ? `repeating-linear-gradient(90deg, ${顏} 0 4px, transparent 4px 7px)` : 顏; s.append(i, 文); return s; };
  例.append(項("#58a6ff", 選("泳道：一顆泡泡從包到結束", "lane: one bubble's life")), 項("#bc8cff", 選("扣環：子泡泡接在父泡泡哪一步之後", "buckle: which parent step the child hangs on"), true),
    項("#6e7681", 選("灰框：剪斷", "grey square: cut")));
  盒.append(例);
  return 盒;
}

const 畫們 = { 駭客: 畫駭客, 地圖: 畫地圖, 矩陣: 畫矩陣, 時間: 畫時間 };

function 重畫() {
  for (const b of document.querySelectorAll(".晶片")) b.setAttribute("aria-checked", String(b.dataset.名 === 選版));
  for (const b of document.querySelectorAll(".分頁 button")) b.setAttribute("aria-selected", String(b.dataset.名 === 選視));
  const u = new URL(location.href); if (選版) u.searchParams.set("v", 選版); u.searchParams.set("view", 視角鍵[選視]); history.replaceState(null, "", u);
  const 條 = 核?.視角表.find((v) => v.名 === 選視);
  $("視角問題").textContent = 條 ? 選(...條.問題) : "";
  if (!核 || !選版 || !紀錄們[選版]) return;
  if (條.範圍 === "全部" && 目錄.some((v) => !紀錄們[v.名])) { $("畫布").replaceChildren(新("p", "淡", 選("等五個版本都跑完…", "Waiting for all five versions to finish…"))); return; }
  try {
    const 模 = 條.範圍 === "全部" ? 核.看(選視, 目錄.map((v) => 紀錄們[v.名])) : 核.看(選視, 紀錄們[選版]);
    const 決 = 條.範圍 === "全部" ? null : 模.決定;
    const 章 = $("決定章"); 章.textContent = 決 ? `${版名(選版)} → ${格字(決)}` : ""; if (決) 章.style.setProperty("--色", 色(決));
    $("畫布").replaceChildren(畫們[選視](模));
  } catch (e) { $("畫布").replaceChildren(新("p", null, 選("停下來了：", "Stopped: ") + e.message)); }
}

// 先畫按鈕；檢查工具在背景下載，下載完把五個版本各跑一次（矩陣要全部）
目錄 = await (await fetch("examples/目錄.json", { cache: "no-store" })).json();
選版 = 目錄.find((v) => v.名 === 參.get("v"))?.名 || "C_self_signed";
$("版本們").replaceChildren(...目錄.map((v) => {
  const b = 新("button", "晶片", 選(v.中文名, v.英文名.replace(/\s+/g, " "))); b.type = "button"; b.dataset.名 = v.名;
  b.setAttribute("role", "radio"); b.addEventListener("click", () => { 選版 = v.名; 重畫(); });
  return b;
}));
$("視角們").replaceChildren(...Object.keys(視角字).map((名) => {
  const b = 新("button", null, 字(視角字, 名)); b.type = "button"; b.dataset.名 = 名; b.setAttribute("role", "tab");
  b.append(新("small", null, 視角鍵[名]));
  b.addEventListener("click", () => { 選視 = 名; 重畫(); });
  return b;
}));
重畫();

try {
  const [模組, 文] = await Promise.all([載入核心(), fetch(是英文 ? "core/法典.en.txt" : "core/法典.txt", { cache: "no-store" }).then((r) => r.text())]);
  核 = 模組; const 法 = 核.翻譯(文);
  const 讀或空 = (基底) => async (f) => { const r = await fetch(new URL(f, 基底), { cache: "no-store" }); return r.ok ? r.text() : null; };
  const 基準 = new URL("examples/A_normal/", location.href);
  for (const v of 目錄) {
    const 基底 = new URL(`examples/${v.名}/`, location.href), 讀 = 讀或空(基底);
    紀錄們[v.名] = await 核.做紀錄({
      版本名: v.名, 網路檔名: v.網路, 讀, 讀基準: 讀或空(基準), 法,
      工具環境: { 網路網址: new URL(網名, 基底).href, fetchImpl: fetch.bind(globalThis), pageOrigin: location.origin, 網路檔名: v.網路,
        讀JSON: async (f) => { const t = await 讀(f); if (t == null) throw new Error(f + " 404"); return JSON.parse(t); } },
    });
    if (v.名 === 選版) 重畫();
  }
  $("載入").hidden = true;
  重畫();
} catch (e) { $("載入").textContent = 選("載入失敗：", "Failed to load: ") + e.message; }
