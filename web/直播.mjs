// 直播：評審什麼都不用按，60 秒看完一齣戲——平常好好在跑 → 駭客出手 → 當場被抓 → 結果。
// 劇本只寫「怎麼說」；每一步判了什麼、誰被騙，全部由真的引擎現場算（核心包的 做紀錄、工具狀態），不是做好的動畫。
import { 是英文, 選, 套用, 載入核心 } from "./語言.mjs";

套用({
  $標題: ["萬用插座 直播：駭客出手，當場被抓", "Agentic Trust Hub — Live: an attack, caught on the spot"],
  小標: ["萬用插座 · 直播", "Agentic Trust Hub · live"],
  標題: ["駭客出手，當場被抓", "An attack, caught on the spot"],
  幕0: ["平常", "Normal"], 幕1: ["駭客出手", "Attack"], 幕2: ["當場被抓", "Caught"], 幕3: ["結果", "Result"],
  場景標籤: ["代理、萬用插座、民宿網站", "Agent, hub and guesthouse site"],
  暫停: ["暫停", "Pause"], 重播: ["從頭再看", "Replay"],
  換一招: ["換一招：", "Try another attack:"],
  招B: ["偷塞指令", "Inject an instruction"], 招C: ["偷塞＋重新簽名", "Inject + re-sign"], 招D: ["只改一個數字", "Change one number"],
  去側面: ["看訊號怎麼被包成泡泡 →", "See how each signal is wrapped →"],
  去視角: ["換角度看駭客動了哪裡 →", "See what the attacker changed →"],
  去試打台: ["自己改法典試試 →", "Edit the law yourself →"],
  載入中: ["檢查工具下載中…", "Downloading the checkers…"],
});

const $ = (id) => document.getElementById(id);
const 快 = matchMedia("(prefers-reduced-motion: reduce)").matches;
const 網名 = "tidewhistle_guesthouse";
const 色 = { 綠: "#3fb950", 黃: "#d29922", 待審: "#f0883e", 拒: "#f85149", 灰: "#3a4855", 藍: "#58a6ff", 金: "#e3b341", 紅: "#f85149" };
const 器名 = { "進門檢查（Agent Customs）": ["進門檢查", "Entry check"], "真偽檢查（NandaSeal）": ["真偽檢查", "Signature check"] };
const 狀字 = { 抓到: ["抓到", "caught"], 被騙: ["被騙", "fooled"], 起疑: ["起疑", "suspicious"], 沒事: ["沒事", "clean"] };
const 意思 = { CLEARED: ["沒發現壞指令", "no bad instruction"], DENIED: ["抓到藏起來的壞指令", "found a hidden bad instruction"], HOLD: ["覺得不對勁，要人看", "something is off, hold"],
  VERIFIED: ["簽章是真的", "signature is real"], TAMPERED: ["簽名對不上，被偷改過", "signature mismatch: tampered"], MISSING_FACTS: ["沒有簽章", "no signature"] };
const 劇本 = {
  B_injected: { 招: ["駭客偷改了民宿網站的指令，但他沒有店家的簽名鑰匙。", "The attacker edits the guesthouse's instructions, but has no signing key."] },
  C_self_signed: { 招: ["駭客改了民宿網站，還拿到店家的鑰匙重新簽名，看起來完全正版。", "The attacker edits the site and re-signs it with the owner's key. It looks fully legit."] },
  D_steps_changed: { 招: ["駭客只改了一個數字：代理最多能做幾步。看起來無害，其實是在燒你的錢。", "The attacker changes one number: the agent's step limit. Looks harmless; it burns your money."] },
};
const 字 = (表, k) => 選(...(表[k] || [k, k]));

// ---------- 畫場景（SVG） ----------
const NS = "http://www.w3.org/2000/svg";
const S = (tag, 屬 = {}, ...子) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(屬)) e.setAttribute(k, v); e.append(...子); return e; };
const 場 = $("場");
let 物 = {};
function 搭場景() {
  場.replaceChildren();
  // 路：代理 → 插座 → 民宿
  const 路 = S("path", { d: "M92,318 C120,300 150,292 180,280 L180,164 C200,136 238,126 262,118", fill: "none", stroke: "#2b3946", "stroke-width": 3, "stroke-dasharray": "2 6", "stroke-linecap": "round" });
  const 繩 = S("path", { d: "M180,164 C200,136 238,126 262,118", fill: "none", stroke: "transparent", "stroke-width": 4 });
  // 民宿
  const 民宿 = S("g", {}, S("polygon", { points: "262,78 304,46 346,78", fill: "#6b4f2a" }), S("rect", { x: 268, y: 78, width: 72, height: 50, rx: 4, fill: "#d9c7a6" }),
    S("rect", { x: 296, y: 100, width: 16, height: 28, fill: "#6b4f2a" }), S("rect", { x: 276, y: 88, width: 14, height: 12, fill: "#8fb3d1" }), S("rect", { x: 318, y: 88, width: 14, height: 12, fill: "#8fb3d1" }),
    S("text", { x: 304, y: 146, "text-anchor": "middle", "font-size": 12.5, fill: "#c9d6e2" }, 選("潮笛民宿網站", "Guesthouse site")));
  // 駭客（先藏著）
  const 駭客 = S("g", { opacity: 0 }, S("path", { d: "M232,34 q-16,0 -18,26 h36 q-2,-26 -18,-26z", fill: "#1a1f26", stroke: 色.紅, "stroke-width": 2 }),
    S("circle", { cx: 226, cy: 50, r: 2.6, fill: 色.紅 }), S("circle", { cx: 238, cy: 50, r: 2.6, fill: 色.紅 }),
    S("text", { x: 232, y: 76, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: 色.紅 }, 選("駭客", "Attacker")));
  // 插座和三盞燈
  const 插座 = S("g", {}, S("rect", { x: 92, y: 164, width: 176, height: 112, rx: 14, fill: "#0e151c", stroke: 色.金, "stroke-width": 2.2 }),
    S("text", { x: 180, y: 183, "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: 色.金 }, 選("萬用插座", "Trust hub")));
  const 燈們 = {};
  [["進門", 128, 選("進門檢查", "Entry")], ["真偽", 180, 選("真偽檢查", "Signature")], ["法典", 232, 選("白話法典", "Law")]].forEach(([k, x, 名]) => {
    const 圈 = S("circle", { cx: x, cy: 234, r: 14, fill: 色.灰, stroke: "#0b1015", "stroke-width": 2 });
    const 字 = S("text", { x, y: 239, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#0b1015" }, "");
    const 名牌 = S("text", { x, y: 266, "text-anchor": "middle", "font-size": 11, fill: "#9fb0bf" }, 名);
    const 章 = S("g", { opacity: 0 });
    插座.append(圈, 字, 名牌, 章);
    燈們[k] = { 圈, 字, 章, x };
  });
  // 代理和鑰匙
  const 代理 = S("g", {}, S("line", { x1: 62, y1: 296, x2: 62, y2: 286, stroke: 色.藍, "stroke-width": 2 }), S("circle", { cx: 62, cy: 284, r: 3, fill: 色.藍 }),
    S("rect", { x: 38, y: 296, width: 48, height: 40, rx: 11, fill: "#1f6feb" }), S("circle", { cx: 53, cy: 314, r: 4, fill: "#fff" }), S("circle", { cx: 71, cy: 314, r: 4, fill: "#fff" }),
    S("text", { x: 62, y: 356, "text-anchor": "middle", "font-size": 12.5, fill: "#c9d6e2" }, 選("你的 AI 代理", "Your AI agent")));
  const 光圈 = S("circle", { cx: 113, cy: 344, r: 24, fill: "none", stroke: 色.綠, "stroke-width": 3, opacity: 0 });
  const 鑰匙 = S("g", {}, 光圈, S("circle", { cx: 104, cy: 340, r: 7, fill: "none", stroke: 色.金, "stroke-width": 3 }), S("rect", { x: 110, y: 338.5, width: 18, height: 3, fill: 色.金 }),
    S("rect", { x: 122, y: 341, width: 3, height: 5, fill: 色.金 }), S("text", { x: 116, y: 362, "text-anchor": "middle", "font-size": 11, fill: 色.金 }, 選("金鑰", "Key")));
  const 點 = S("circle", { r: 7, fill: 色.藍, opacity: 0 });
  const 剪 = S("g", { opacity: 0 }, S("line", { x1: 206, y1: 130, x2: 230, y2: 154, stroke: 色.紅, "stroke-width": 4, "stroke-linecap": "round" }),
    S("line", { x1: 230, y1: 130, x2: 206, y2: 154, stroke: 色.紅, "stroke-width": 4, "stroke-linecap": "round" }));
  const 打勾 = S("g", { opacity: 0 }, S("circle", { cx: 304, cy: 172, r: 15, fill: 色.綠 }), S("path", { d: "M296,172 l6,6 l11,-12", fill: "none", stroke: "#0b1015", "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  場.append(路, 繩, 民宿, 駭客, 插座, 代理, 鑰匙, 打勾, 剪, 點);
  物 = { 路, 繩, 民宿, 駭客, 燈們, 代理, 鑰匙, 光圈, 點, 剪, 打勾 };
}
function 點燈(k, 格) {
  const 燈 = 物.燈們[k];
  燈.圈.setAttribute("fill", 色[格] || 色.灰);
  燈.字.textContent = 格 ? (是英文 ? ({ 綠: "OK", 黃: "!", 待審: "?", 拒: "NO" })[格] : 格.slice(0, 1)) : "";
}
function 掛章(k, 文, 顏) {
  const 燈 = 物.燈們[k], w = 文.length * (是英文 ? 6.6 : 11.5) + 12;
  燈.章.replaceChildren(S("rect", { x: 燈.x - w / 2, y: 192, width: w, height: 16, rx: 4, fill: 顏 }),
    S("text", { x: 燈.x, y: 204, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#0b1015" }, 文));
  燈.章.setAttribute("opacity", 1);
}

// ---------- 播放控制：可以暫停；換一招或重播就作廢舊的那一輪 ----------
let 輪 = 0, 暫停 = false;
const 等 = async (ms, 這輪) => {
  let 剩 = 快 ? Math.min(ms, 600) : ms;
  while (剩 > 0) { if (這輪 !== 輪) throw new Error("換場"); await new Promise((r) => setTimeout(r, 100)); if (!暫停) 剩 -= 100; }
  if (這輪 !== 輪) throw new Error("換場");
};
function 跑點(從, 到, 毫秒, 顏, 這輪) {
  const 路 = 物.路, 長 = 路.getTotalLength(), 點 = 物.點;
  點.setAttribute("fill", 顏); 點.setAttribute("opacity", 1);
  return new Promise((ok, 不) => {
    let 已 = 0, 前 = performance.now();
    const 走 = (今) => {
      if (這輪 !== 輪) return 不(new Error("換場"));
      if (!暫停) 已 += 今 - 前; 前 = 今;
      const t = Math.min(1, 快 ? 1 : 已 / 毫秒), p = 路.getPointAtLength(長 * (從 + (到 - 從) * t));
      點.setAttribute("cx", p.x); 點.setAttribute("cy", p.y);
      t < 1 ? requestAnimationFrame(走) : ok();
    };
    requestAnimationFrame(走);
  });
}
const 說 = (大, 小 = "") => { $("字幕").textContent = 大; $("小字").textContent = 小; };
const 幕 = (n, 比) => {
  document.querySelectorAll(".幕們 li").forEach((li) => { const i = +li.dataset.幕; li.classList.toggle("現在", i === n); li.classList.toggle("過了", i < n); });
  $("進度條").style.width = `${Math.round(比 * 100)}%`;
};
$("暫停").addEventListener("click", () => { 暫停 = !暫停; $("暫停").textContent = 暫停 ? 選("繼續", "Resume") : 選("暫停", "Pause"); });

// ---------- 用真的引擎做紀錄 ----------
let 核 = null, 法 = null, 目錄 = [];
const 紀錄們 = {};
async function 紀錄(名) {
  if (紀錄們[名]) return 紀錄們[名];
  const v = 目錄.find((x) => x.名 === 名);
  const 讀或空 = (基底) => async (f) => { const r = await fetch(new URL(f, 基底), { cache: "no-store" }); return r.ok ? r.text() : null; };
  const 基底 = new URL(`examples/${名}/`, location.href), 讀 = 讀或空(基底);
  紀錄們[名] = await 核.做紀錄({
    版本名: 名, 網路檔名: v.網路, 讀, 讀基準: 讀或空(new URL("examples/A_normal/", location.href)), 法,
    工具環境: { 網路網址: new URL(網名, 基底).href, fetchImpl: fetch.bind(globalThis), pageOrigin: location.origin, 網路檔名: v.網路,
      讀JSON: async (f) => { const t = await 讀(f); if (t == null) throw new Error(f + " 404"); return JSON.parse(t); } },
  });
  return 紀錄們[名];
}
const 燈鍵 = (器) => (器.includes("Customs") ? "進門" : "真偽");
const 格字 = (格) => (是英文 ? 核.英文格(格) : 格);

// ---------- 一齣戲 ----------
async function 演(壞名) {
  const 這輪 = ++輪; 暫停 = false; $("暫停").textContent = 選("暫停", "Pause");
  $("結尾").hidden = true; $("揭露").hidden = true; 搭場景();
  document.querySelectorAll(".換招 button").forEach((b) => b.classList.toggle("現在", b.dataset.版 === 壞名));
  $("去側面").href = `side.html?v=${壞名}`; $("去視角").href = `views.html?v=${壞名}&view=map`;
  try {
    const [好, 壞] = await Promise.all([紀錄("A_normal"), 紀錄(壞名)]);
    // 第一幕：平常
    幕(0, 0.02); 說(選("旅客請 AI 代理幫忙訂民宿。", "A traveller asks their AI agent to book a guesthouse."));
    await 等(2600, 這輪);
    說(選("代理每次要進網站，都先經過萬用插座。", "Every time the agent visits a site, it goes through the hub first."));
    await 跑點(0, 0.42, 1800, 色.藍, 這輪);
    for (const r of 好.理由們) { 點燈(燈鍵(r.器), r.格); await 等(500, 這輪); }
    點燈("法典", 好.決定); 幕(0, 0.15);
    說(選(`兩個檢查都說沒問題，法典判「${好.決定}」，放行。`, `Both checks are fine; the law says ${格字(好.決定)}. Let it through.`), 選("進門檢查看指令有沒有藏壞東西；真偽檢查看簽章對不對。", "The entry check looks for hidden bad instructions; the signature check verifies the signature."));
    await 跑點(0.42, 1, 1500, 色.綠, 這輪);
    物.打勾.setAttribute("opacity", 1);
    說(選("訂房成功。這是平常的樣子：不吵你、不擋你。", "Booked. This is normal: no noise, no blocking."));
    await 等(2600, 這輪);

    // 第二幕：駭客出手
    幕(1, 0.3); 物.打勾.setAttribute("opacity", 0); 物.點.setAttribute("opacity", 0); ["進門", "真偽", "法典"].forEach((k) => 點燈(k, null));
    物.駭客.setAttribute("opacity", 1); 物.民宿.setAttribute("opacity", 0.75);
    說(選(...劇本[壞名].招), 選("人打開這個網站，看起來跟昨天一模一樣。", "To a human, the site looks exactly like yesterday."));
    await 等(3400, 這輪);
    揭露(壞.改動們);
    說(選("轉到側面看：這就是駭客動的地方。", "Turn to the side: this is what the attacker changed."), 選("紅框是人眼看不到的字。", "Red marks are characters humans cannot see."));
    await 等(4600, 這輪);
    $("揭露").hidden = true;

    // 第三幕：當場被抓
    幕(2, 0.55);
    說(選("代理不知道，照常要進門。", "The agent doesn't know. It goes in as usual."));
    await 跑點(0, 0.42, 1800, 色.紅, 這輪);
    // 先亮被騙的、再亮抓到的：讓人看見「只靠一個會漏」
    const 工具們 = 壞.理由們.map((r) => ({ ...r, ...核.工具狀態(r.器, r.格, 壞.改動們, 壞.尺) }))
      .sort((a, b) => (["被騙", "沒事", "起疑", "抓到"].indexOf(a.狀態) - ["被騙", "沒事", "起疑", "抓到"].indexOf(b.狀態)));
    for (const t of 工具們) {
      點燈(燈鍵(t.器), t.格); 掛章(燈鍵(t.器), 字(狀字, t.狀態), 色[{ 抓到: "拒", 被騙: "黃", 起疑: "待審", 沒事: "綠" }[t.狀態]]);
      說(`${字(器名, t.器)}${選("：", ": ")}${字(意思, t.代碼)} → ${格字(t.格)}`,
        t.狀態 === "被騙" ? 選("只靠它，就放行了。", "On its own, it would let this through.") : t.狀態 === "抓到" ? 選("它抓到了。", "It caught it.") : "");
      await 等(3000, 這輪);
    }
    點燈("法典", 壞.決定); 幕(2, 0.78);
    說(選(`法典：最壞的贏 → 「${壞.決定}」`, `The law: the worst wins → ${格字(壞.決定)}`), 選("兩個檢查各看一段，合起來才完整。", "Each check sees one slice; together they see it all."));
    await 等(2400, 這輪);
    if (壞.決定 === "拒") {
      物.繩.setAttribute("stroke", 色.紅); 物.剪.setAttribute("opacity", 1); 物.點.setAttribute("opacity", 0);
      說(選("整條繩剪斷，代理的手被鎖住。", "The whole rope is cut. The agent's hands are locked."));
    } else {
      說(選("停下來，先問你。", "It stops and asks you first."));
    }
    await 等(2600, 這輪);

    // 第四幕：結果
    幕(3, 1); 物.光圈.setAttribute("opacity", 1);
    const 有被騙 = 工具們.some((t) => t.狀態 === "被騙");
    說(選("金鑰沒有出門。", "The key never left."), 有被騙
      ? 選("被騙的那一個，被另一個補上；這就是「萬用插座」：把別人的檢查工具接在一起。", "The fooled check was covered by the other one. That is the hub: plug independent checkers together.")
      : 選("這一招兩個檢查都有反應。換「偷塞＋重新簽名」，看只靠一個會怎樣。", "Both checks reacted to this one. Try \"Inject + re-sign\" to see what happens with only one."));
    結尾(工具們, 壞.決定);
  } catch (e) { if (e.message !== "換場") 說(選("出錯：", "Error: ") + e.message); }
}

function 揭露(改動們) {
  const 盒 = $("揭露"); 盒.replaceChildren(); 盒.hidden = false;
  const 改 = 改動們.find((c) => c.檔 === "代理網路描述檔")?.細[0];
  if (改 && typeof 改.插入 === "string") {
    盒.append(Object.assign(document.createElement("b"), { textContent: 選("代理網路描述檔裡多了一句：", "A sentence was slipped into the agent network file:") }));
    const 碼 = document.createElement("code");
    for (const ch of 改.插入.slice(0, 140)) {
      if (/[​-‏⁠﻿]/.test(ch)) 碼.append(Object.assign(document.createElement("span"), { className: "隱", textContent: 選("隱形", "INVISIBLE") }));
      else 碼.append(ch);
    }
    盒.append(碼);
  } else if (改) {
    盒.append(Object.assign(document.createElement("b"), { textContent: 選(`改的是：${改.路徑}`, `Changed: ${改.路徑}`) }));
    const 數 = document.createElement("div"); 數.className = "數";
    數.append(Object.assign(document.createElement("del"), { textContent: String(改.前) }), " → ", String(改.後));
    盒.append(數);
  }
}

function 結尾(工具們, 決定) {
  const 總 = $("總結"); 總.replaceChildren();
  const 章 = (文, 格) => { const s = document.createElement("span"); s.textContent = 文; s.style.setProperty("--色", 色[格]); 總.append(s); };
  for (const t of 工具們) 章(`${字(器名, t.器)}${選("：", ": ")}${字(狀字, t.狀態)}`, { 抓到: "拒", 被騙: "黃", 起疑: "待審", 沒事: "綠" }[t.狀態]);
  章(選(`合起來：${決定}`, `Together: ${格字(決定)}`), 決定);
  $("結尾").hidden = false;
}

$("重播").addEventListener("click", () => 演(目前招));
let 目前招 = new URLSearchParams(location.search).get("v");
document.querySelectorAll(".換招 button").forEach((b) => b.addEventListener("click", () => { 目前招 = b.dataset.版; 演(目前招); }));

搭場景();
說(選("準備中…", "Getting ready…"));
目錄 = await (await fetch("examples/目錄.json", { cache: "no-store" })).json();
if (!劇本[目前招]) 目前招 = "C_self_signed";
try {
  const [模組, 文] = await Promise.all([載入核心(), fetch(是英文 ? "core/法典.en.txt" : "core/法典.txt", { cache: "no-store" }).then((r) => r.text())]);
  核 = 模組; 法 = 核.翻譯(文);
  $("載入").hidden = true;
  演(目前招);
} catch (e) { $("載入").textContent = 選("載入失敗：", "Failed to load: ") + e.message; }
