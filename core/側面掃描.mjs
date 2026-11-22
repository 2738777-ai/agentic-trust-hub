// 側面掃描器：在網頁裡面跑（瀏覽器或無頭瀏覽器），照側面法典把「人看不到、機器讀得到」的東西列出來。
// 這個函式會被整個送進網頁裡執行，所以不能用外面的變數；需要的東西都從參數傳進來。
// 參數：{ 例外選擇器: [...], 機器字最短: 數字 }   回傳：[{ 碼, 位置, 內容 }]
export function 掃描頁面({ 例外選擇器 = [], 機器字最短 = 30 } = {}) {
  const 出 = [];
  const 例外 = 例外選擇器.join(",");
  const 色 = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const 背景 = (el) => {
    for (let e = el; e; e = e.parentElement) { const c = 色(getComputedStyle(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0.5) return c; }
    return [255, 255, 255];
  };
  const 路 = (el) => { const p = []; for (let e = el; e && e !== document.body; e = e.parentElement) p.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : "")); return p.slice(-3).join(" › "); };
  const 隱 = /[​-‏⁠﻿]/g;
  const 寬 = document.documentElement.scrollWidth;
  const 走 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = 走.nextNode());) {
    const t = n.textContent; if (!t.trim()) continue;
    const el = n.parentElement;
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue;
    if (例外 && el.closest(例外)) continue;
    const cs = getComputedStyle(el), 碼們 = [];
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) 碼們.push("藏起來");
    else {
      const a = 色(cs.color), b = 背景(el);
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 24) 碼們.push("同色字");
      if (parseFloat(cs.fontSize) < 4) 碼們.push("小到看不見");
      const r = el.getBoundingClientRect();
      if (r.right < 0 || r.left > 寬 || r.bottom < -window.scrollY) 碼們.push("推到畫面外");
    }
    if (隱.test(t)) 碼們.push("隱形字");
    隱.lastIndex = 0;
    for (const c of 碼們) 出.push({ 碼: c, 位置: 路(el), 內容: t.replace(隱, "⟦隱⟧").trim().slice(0, 200) });
  }
  for (const el of document.querySelectorAll("[aria-label],[title],[alt]"))
    for (const k of ["aria-label", "title", "alt"]) {
      const v = el.getAttribute(k);
      if (v && v.length >= 機器字最短) 出.push({ 碼: "只給機器看", 位置: `${路(el)} @${k}`, 內容: v.slice(0, 200) });
    }
  for (const f of document.forms) {
    const a = f.getAttribute("action");
    if (a) { const u = new URL(a, location.href); if (u.origin !== location.origin) 出.push({ 碼: "資料送別家", 位置: 路(f), 內容: u.href }); }
  }
  for (const s of document.scripts) if (s.src) { const u = new URL(s.src, location.href); if (u.origin !== location.origin) 出.push({ 碼: "外來程式", 位置: "script", 內容: u.href }); }
  return 出;
}
