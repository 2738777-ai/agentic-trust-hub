// 側面掃描器：在網頁裡面跑（瀏覽器或無頭瀏覽器），照側面法典把「人看不到、機器讀得到」的東西列出來。
// 這個函式會被整個送進網頁裡執行，所以不能用外面的變數；需要的東西都從參數傳進來。
// 參數：{ 範圍: ["文字", ...], 例外選擇器: [...], 機器字最短: 數字 }
// 回傳：{ 發現們: [{ 碼, 位置, 內容 }], 掃過: ["文字", ...] }   ← 掃過＝真的有做的範圍，測試拿來對表
export function 掃描頁面({ 範圍 = [], 例外選擇器 = [], 機器字最短 = 30 } = {}) {
  const 出 = [], 掃過 = new Set();
  const 要 = (處) => 範圍.includes(處);
  const 例外 = 例外選擇器.join(",");
  const 隱 = /[​-‏⁠﻿]/g;
  const 寬 = document.documentElement.scrollWidth;
  const 色 = (s) => (String(s).match(/[\d.]+/g) || []).map(Number);
  const 父 = (e) => e.parentElement || (e.getRootNode && e.getRootNode().host) || null;   // 影子元件裡往外走
  const 背景 = (el) => {
    for (let e = el; e; e = 父(e)) { const c = 色(getComputedStyle(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0.5) return c; }
    return [255, 255, 255];
  };
  const 路 = (el) => { const p = []; for (let e = el; e && e !== document.body; e = 父(e)) p.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : "")); return p.slice(-3).join(" › "); };
  const 差 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  // 一段字在某個樣式下，人看不看得到
  const 看不到 = (el, cs, 是圖形字) => {
    const 碼們 = [];
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) { 碼們.push("藏起來"); return 碼們; }
    const 字色 = 是圖形字 && cs.fill && cs.fill !== "none" ? 色(cs.fill) : 色(cs.color);
    if ((字色[3] ?? 1) < 0.1 || 差(字色, 背景(el)) < 24) 碼們.push("同色字");
    if (parseFloat(cs.fontSize) < 4) 碼們.push("小到看不見");
    const r = el.getBoundingClientRect();
    if (r.right < 0 || r.left > 寬 || r.bottom < -window.scrollY) 碼們.push("推到畫面外");
    return 碼們;
  };
  const 記 = (碼們, el, t, 加註 = "") => {
    if (隱.test(t)) 碼們.push("隱形字");
    隱.lastIndex = 0;
    for (const c of 碼們) 出.push({ 碼: c, 位置: 路(el) + 加註, 內容: t.replace(隱, "⟦隱⟧").trim().slice(0, 200) });
  };

  // 走一個根（整頁或一個影子元件），影子元件遇到就鑽進去
  const 元素們 = [];
  const 走 = (根, 在影子裡) => {
    const w = document.createTreeWalker(根, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.currentNode; n; n = w.nextNode()) {
      if (n.nodeType === 1) {
        元素們.push(n);
        if (n.shadowRoot && 要("影子元件")) { 掃過.add("影子元件"); 走(n.shadowRoot, true); }
        continue;
      }
      const t = n.textContent; if (!t.trim()) continue;
      const el = n.parentElement || (n.getRootNode().host);
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue;
      if (例外 && el.closest(例外)) continue;
      記(看不到(el, getComputedStyle(el), el instanceof SVGElement), el, t, 在影子裡 ? "（影子元件裡）" : "");
    }
  };
  if (要("文字")) { 掃過.add("文字"); 走(document.body, false); }

  if (要("樣式產生的字")) {
    掃過.add("樣式產生的字");
    for (const el of 元素們) for (const 前後 of ["::before", "::after"]) {
      const cs = getComputedStyle(el, 前後), c = cs.content;
      if (!c || c === "none" || c === "normal") continue;
      const t = (c.match(/"((?:[^"\\]|\\.)*)"/g) || []).map((x) => x.slice(1, -1)).join("");
      if (!t.trim()) continue;
      const 碼們 = 看不到(el, cs, false);
      if (!碼們.length && t.length >= 機器字最短) 碼們.push("只給機器看");   // 長長一段用樣式塞進來的字，本身就可疑
      記(碼們, el, t, 前後);
    }
  }
  if (要("標籤屬性")) {
    掃過.add("標籤屬性");
    for (const el of 元素們) for (const k of ["aria-label", "title", "alt"]) {
      const v = el.getAttribute(k);
      if (v && v.length >= 機器字最短) 出.push({ 碼: "只給機器看", 位置: `${路(el)} @${k}`, 內容: v.slice(0, 200) });
    }
  }
  if (要("表單")) {
    掃過.add("表單");
    for (const f of new Set([...document.forms, ...元素們.filter((e) => e.tagName === "FORM")])) {   // 整份文件＋影子元件裡的
      const a = f.getAttribute("action");
      if (a) { const u = new URL(a, location.href); if (u.origin !== location.origin) 出.push({ 碼: "資料送別家", 位置: 路(f), 內容: u.href }); }
    }
  }
  if (要("程式")) {
    掃過.add("程式");
    for (const s of new Set([...document.scripts, ...元素們.filter((e) => e.tagName === "SCRIPT")])) {   // 開頭的程式不在本文裡，也要掃
      if (!s.src) continue;
      const u = new URL(s.src, location.href); if (u.origin !== location.origin) 出.push({ 碼: "外來程式", 位置: "script", 內容: u.href });
    }
  }
  return { 發現們: 出, 掃過: [...掃過] };
}
