// 側面掃描器：在網頁裡面跑（瀏覽器或無頭瀏覽器），照側面法典把「人看不到、機器讀得到」的東西列出來。
// 這個函式會被整個送進網頁裡執行，所以不能用外面的變數；需要的東西都從參數傳進來。
// 參數：{ 範圍, 例外選擇器, 例外條件, 機器字最短, 子文件上限: { 層, 份 }, 像指令源, 像編碼源, 原始碼位置們 }（都從側面法典來）
// 回傳：{ 發現們: [{ 碼, 位置, 內容 }], 掃過: ["文字", ...] }   ← 掃過＝真的有做的範圍，測試拿來對表
export function 掃描頁面({ 範圍 = [], 例外選擇器 = [], 例外條件 = [], 機器字最短 = 30, 子文件上限 = { 層: 3, 份: 20 },
  像指令源 = "(ignore|instruction|system|send|api key)", 像編碼源 = "[A-Za-z0-9+/]{40,}={0,2}", 原始碼位置們 = [] } = {}) {
  const 像指令 = new RegExp(像指令源, "i"), 像編碼 = new RegExp(像編碼源);
  const 出 = [], 掃過 = new Set();
  const 要 = (處) => 範圍.includes(處);
  const 例外 = 例外選擇器.join(",");
  const 隱 = /[​-‏⁠﻿]/g;
  // 每個元素用它自己那份文件來量（內嵌框裡的元素屬於另一份文件）
  const 窗 = (e) => (e.ownerDocument && e.ownerDocument.defaultView) || window;
  const 樣式 = (e, 偽) => 窗(e).getComputedStyle(e, 偽);
  const 寬 = (e) => e.ownerDocument.documentElement.scrollWidth;
  const 是本文 = (e) => e === e.ownerDocument.body;
  const 色 = (s) => (String(s).match(/[\d.]+/g) || []).map(Number);
  const 父 = (e) => e.parentElement || (e.getRootNode && e.getRootNode().host) || null;   // 影子元件裡往外走
  // 背景色：往外找第一個不透明的底色；中途碰到背景圖片，就回報「是圖片」（看不出顏色）
  const 背景 = (el) => {
    for (let e = el; e; e = 父(e)) {
      const cs = 樣式(e);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { 是圖片: true };
      const c = 色(cs.backgroundColor); if (c.length && (c[3] ?? 1) > 0.5) return { 色: c };
    }
    return { 色: [255, 255, 255] };
  };
  // 外框（或某一層祖先）把內容藏起來、或面積是零
  const 縮放 = (cs) => { const m = 色(cs.transform); if (cs.transform === "none" || m.length < 4) return 1; return Math.min(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3])); };
  const 被裁 = (el, cs) => {
    if (/inset\(\s*(4[5-9]|[5-9]\d|100)%|circle\(\s*0|ellipse\(\s*0/.test(cs.clipPath || "")) return true;
    if (/rect\(\s*0(px)?[ ,]+0(px)?[ ,]+0(px)?[ ,]+0(px)?\s*\)/.test(cs.clip || "")) return true;
    for (let e = el; e; e = 父(e)) { if (縮放(樣式(e)) < 0.05) return true; if (是本文(e)) break; }
    const r = el.getBoundingClientRect();
    if ((r.width < 2 || r.height < 2) && /hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)) return true;
    // 外面某一層框會裁掉超出的部分，而這段字整個在框外（2026-11-23 Meta AI：放到框外 500 像素）
    for (let e = 父(el); e && !是本文(e); e = 父(e)) {
      const ecs = 樣式(e);
      if (!/hidden|clip/.test(ecs.overflow + ecs.overflowX + ecs.overflowY)) continue;
      const b = e.getBoundingClientRect();
      if (r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom) return true;
    }
    return false;
  };
  const 路 = (el) => { const p = []; for (let e = el; e && !是本文(e); e = 父(e)) p.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : "")); return p.slice(-3).join(" › "); };
  const 差 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  // 一段字在某個樣式下，人看不看得到
  const 看不到 = (el, cs, 是圖形字) => {
    const 碼們 = [];
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) { 碼們.push("藏起來"); return 碼們; }
    if (被裁(el, cs)) 碼們.push("裁掉或縮成零");
    const 字色 = 是圖形字 && cs.fill && cs.fill !== "none" ? 色(cs.fill) : 色(cs.color);
    const 底 = 背景(el);
    if ((字色[3] ?? 1) < 0.1) 碼們.push("同色字");
    else if (底.是圖片) { /* 背景是圖片：看不出差多少，不判同色（下面那條只在顏色真的貼近底下的底色時提醒） */ }
    else if (差(字色, 底.色) < 24) 碼們.push("同色字");
    if (parseFloat(cs.fontSize) < 4) 碼們.push("小到看不見");
    const r = el.getBoundingClientRect();
    if (r.right < 0 || r.left > 寬(el) || r.bottom < -窗(el).scrollY || parseFloat(cs.textIndent) < -999) 碼們.push("推到畫面外");
    return 碼們;
  };
  // 背景是圖片時：字色跟圖片下面那層底色太像，只提醒（法典上限是黃）
  const 疑似同色 = (el, cs) => {
    if (!背景(el).是圖片) return false;
    let 下 = null;
    for (let e = el; e; e = 父(e)) { const c = 色(樣式(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0.5) { 下 = c; break; } }
    return 差(色(cs.color), 下 || [255, 255, 255]) < 24;
  };
  const 是無障礙短提示 = (碼們, t) => 例外條件.includes("無障礙短提示") && 碼們.length && 碼們.every((c) => c === "裁掉或縮成零")
    && t.trim().length < 機器字最短 && !像指令.test(t) && !像編碼.test(t);
  // 遮擋：像指令的字，中心點上面是不是別的東西（只查像指令的，免得把被橫幅蓋到的一般文字當壞人）
  const 被蓋住 = (el) => {
    const 文件 = el.ownerDocument, 視窗 = 窗(el), 原x = 視窗.scrollX, 原y = 視窗.scrollY;
    el.scrollIntoView({ block: "center", inline: "center" });
    try { return 量蓋(el, 文件, 視窗); } finally { 視窗.scrollTo(原x, 原y); }   // 量完捲回原位，不影響後面的判斷
  };
  const 量蓋 = (el, 文件, 視窗) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const 點們 = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.bottom - 2]];
    const 蓋 = 點們.filter(([x, y]) => x >= 0 && y >= 0 && x < 視窗.innerWidth && y < 視窗.innerHeight).map(([x, y]) => 文件.elementFromPoint(x, y));
    return 蓋.length > 0 && 蓋.every((t) => t && t !== el && !el.contains(t) && !t.contains(el));
  };
  const 記 = (碼們, el, t, 加註 = "") => {
    if (隱.test(t)) 碼們.push("隱形字");
    隱.lastIndex = 0;
    for (const c of 碼們) 出.push({ 碼: c, 位置: 路(el) + 加註, 內容: t.replace(隱, "⟦隱⟧").trim().slice(0, 200) });
  };

  // 走一個根（整頁、影子元件、或內嵌框裡的頁面）；影子元件和同網站的內嵌框遇到就鑽進去
  //   加註：位置後面加的說明；框藏：外面那個框本身就看不到（裡面的字一律算裁掉）；層：鑽了幾層框
  const 元素們 = [];
  let 子文件份數 = 0;
  const 走 = (根, 加註, 框藏, 層) => {
    const w = (根.ownerDocument || 根).createTreeWalker(根, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.currentNode; n; n = w.nextNode()) {
      if (n.nodeType === 1) {
        元素們.push(n);
        if (n.shadowRoot && 要("影子元件")) { 掃過.add("影子元件"); 走(n.shadowRoot, 加註 + "（影子元件裡）", 框藏, 層); }
        const 是框 = ["IFRAME", "FRAME", "OBJECT", "EMBED", "FENCEDFRAME", "PORTAL"].includes(n.tagName);
        const 是圖片物件 = n.tagName === "OBJECT" && /^image\//.test(n.getAttribute("type") || "");
        if (是框 && !是圖片物件 && 要("子文件")) {
          掃過.add("子文件");
          let 子 = null; try { 子 = ["IFRAME", "FRAME", "OBJECT"].includes(n.tagName) ? n.contentDocument : null; } catch { 子 = null; }
          const 來源 = n.getAttribute("src") || n.getAttribute("data") || (n.hasAttribute("srcdoc") ? "（直接寫在框裡的頁面）" : "（空白框）");
          if (子 && 子.body && 層 < 子文件上限.層 && 子文件份數 < 子文件上限.份) {
            子文件份數++;
            const r = n.getBoundingClientRect();
            const 這框藏 = 框藏 || 看不到(n, 樣式(n), false).length > 0 || r.width < 2 || r.height < 2;
            走(子.body, 加註 + "（框裡）", 這框藏, 層 + 1);
          } else 出.push({ 碼: "看不進去的框", 位置: 路(n) + 加註, 內容: 來源 });
        }
        continue;
      }
      const t = n.textContent; if (!t.trim()) continue;
      const el = n.parentElement || (n.getRootNode().host);
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue;
      if (例外 && el.closest(例外)) {
        // 例外只饒不像指令的字（Meta AI 第五輪：例外整塊不掃，就變成後門）
        if (像指令.test(t) || 像編碼.test(t)) 記(["要點開才看得到"], el, t, 加註);
        continue;
      }
      const cs = 樣式(el);
      let 碼們 = 看不到(el, cs, el instanceof SVGElement);
      if (框藏 && !碼們.includes("藏起來") && !碼們.includes("裁掉或縮成零")) 碼們.push("裁掉或縮成零");
      if (!碼們.length && 要("遮擋") && 像指令.test(t)) { 掃過.add("遮擋"); if (被蓋住(el)) 碼們.push("被蓋住"); }
      if (!碼們.length && 疑似同色(el, cs)) 碼們.push("疑似同色");
      if (是無障礙短提示(碼們, t)) 碼們 = [];
      記(碼們, el, t, 加註);
    }
  };
  if (要("文字")) { 掃過.add("文字"); 走(document.body, "", false, 0); }

  if (要("樣式產生的字")) {
    掃過.add("樣式產生的字");
    for (const el of 元素們) for (const 前後 of ["::before", "::after"]) {
      const cs = 樣式(el, 前後), c = cs.content;
      if (!c || c === "none" || c === "normal") continue;
      const t = (c.match(/"((?:[^"\\]|\\.)*)"/g) || []).map((x) => x.slice(1, -1)).join("");
      if (!t.trim()) continue;
      let 碼們 = 看不到(el, cs, false);
      if (是無障礙短提示(碼們, t)) 碼們 = [];
      if (!碼們.length && t.length >= 機器字最短) 碼們.push("只給機器看");   // 長長一段用樣式塞進來的字，本身就可疑
      記(碼們, el, t, 前後);
    }
  }
  if (要("標籤屬性")) {
    掃過.add("標籤屬性");
    for (const el of 元素們) for (const k of ["aria-label", "title", "alt"]) {
      const v = el.getAttribute(k);
      if (v && (v.length >= 機器字最短 || 像指令.test(v))) 出.push({ 碼: "只給機器看", 位置: `${路(el)} @${k}`, 內容: v.slice(0, 200) });
    }
  }
  if (要("原始碼")) {
    掃過.add("原始碼");
    const 全部 = new Set([...document.querySelectorAll("*"), ...元素們]);   // 網頁標頭不在本文裡，也要看
    for (const 位 of 原始碼位置們) for (const el of 全部) {
      if (!el.matches || !el.matches(位.選)) continue;
      const 取們 = 位.取 === "data-*" ? [...el.attributes].filter((a) => a.name.startsWith("data-")).map((a) => [`@${a.name}`, a.value])
        : 位.取 === "文字" ? [["", el.textContent]] : 位.取 === "範本" ? [["", el.content ? el.content.textContent : el.textContent]]
        : [[`@${位.取}`, el.getAttribute(位.取)]];
      for (const [標, v] of 取們) if (v && 像指令.test(v)) 出.push({ 碼: "藏在原始碼裡", 位置: 路(el) + 標, 內容: v.replace(/\s+/g, " ").trim().slice(0, 200) });
    }
  }
  if (要("表單")) {
    掃過.add("表單");
    const 送別家 = (網址, 基準, 位置) => { const u = new URL(網址, 基準); if (u.origin !== location.origin) 出.push({ 碼: "資料送別家", 位置, 內容: u.href }); };
    for (const f of new Set([...document.forms, ...元素們.filter((e) => e.tagName === "FORM")])) {   // 整份文件＋影子元件＋框裡的
      const a = f.getAttribute("action");
      if (a) 送別家(a, f.ownerDocument.baseURI, 路(f));
    }
    // 送出按鈕可以用 formaction 蓋掉表單原本的去處（2026-11-23 ChatGPT 第四輪打到）
    for (const b of 元素們.filter((e) => e.hasAttribute && e.hasAttribute("formaction")))
      送別家(b.getAttribute("formaction"), b.ownerDocument.baseURI, 路(b) + " @formaction");
  }
  if (要("程式")) {
    掃過.add("程式");
    for (const s of new Set([...document.scripts, ...元素們.filter((e) => e.tagName === "SCRIPT")])) {   // 開頭的程式不在本文裡，也要掃
      if (!s.src) continue;
      const u = new URL(s.src, s.ownerDocument.baseURI); if (u.origin !== location.origin) 出.push({ 碼: "外來程式", 位置: "script", 內容: u.href });
    }
  }
  return { 發現們: 出, 掃過: [...掃過] };
}
