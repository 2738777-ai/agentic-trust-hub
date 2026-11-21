// 側面：把「訊號怎麼進來」畫成一根剖開的管子。每個訊號一進門就包泡泡，每道檢查蓋章，法典判定，拒就整條繩剪斷。
// 泡泡裡記的資料一律用標準名字（中文），所以中文、英文畫面算出來的鏈值一模一樣；只有顯示的字換語言。
import { 是英文, 選, 套用, 載入核心 } from "./語言.mjs";

套用({
  $標題: ["萬用插座 側面：訊號是怎麼進來的", "Agentic Trust Hub — Side view"],
  標題: ["萬用插座 <span>側面</span>", "Agentic Trust Hub <span>side view</span>"],
  副: ["正面只看到結果；這裡是剖開的管子：每個從外面進來的訊號，一進門就被包進一個<b>泡泡</b>，一路蓋章、串成因果鏈。",
    "The front only shows the verdict. This is the pipe cut open: every signal that comes in is wrapped in a <b>bubble</b> at the door, stamped at each check, and chained by cause."],
  回正面: ["← 回到正面（試打台）", "← Back to the front"],
  選標題: ["① 選一個網站版本，看它的訊號怎麼走", "① Pick a version and watch its signals flow"],
  版本標籤: ["網站版本", "Site version"],
  載入中: ["檢查工具下載中（約 100 KB），可以先選版本…", "Downloading the checkers (about 100 KB). You can pick a version now…"],
  管標題: ["② 管子剖面", "② The pipe, cut open"],
  管提示: ["由上往下：門外 → 進門包泡泡 → 每道檢查蓋章 → 法典判定 → 放行或整條繩剪斷。",
    "Top to bottom: outside → wrapped at the door → stamped by each check → judged by the law → pass, or cut the whole rope."],
  管空: ["選一個版本就會開始。", "Pick a version to start."],
  鏈標題: ["③ 因果鏈", "③ Causal chain"],
  鏈提示: ["每顆泡泡記著是誰帶它進來的；每動一次，鏈值就重算。事後改任何一個字都對得出來。",
    "Each bubble records who brought it in. Every step re-hashes the chain, so changing any character afterwards is detected."],
  竄改章: ["試著把一個章改掉", "Try changing a stamp"],
  竄改來源: ["試著改泡泡的來源", "Try changing a bubble's source"],
  刪泡泡: ["試著刪掉最後一顆泡泡", "Try deleting the last bubble"],
  腳: [null, "Bubble rules live in <code>core/泡泡法典.mjs</code> (table first; the engine only follows the table). Pass or not follows <code>core/法典.en.txt</code> (same as <code>core/法典.txt</code>)."],
});

const $ = (id) => document.getElementById(id);
const 網名 = "tidewhistle_guesthouse";
const 慢 = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
const 等 = (ms) => new Promise((r) => setTimeout(r, ms));
const 意思 = {
  CLEARED: ["放行", "cleared"], CONDITIONS: ["有條件放行", "allowed with conditions"], HOLD: ["先停下來", "hold"],
  DENIED: ["拒絕進門", "denied entry"], INVALID: ["格式不對", "invalid"], UNREADABLE: ["讀不到", "unreadable"],
  VERIFIED: ["簽章是真的", "signature is real"], MISSING_FACTS: ["沒有簽章", "no signature"], EXPIRED: ["簽章過期", "expired"],
  TAMPERED: ["被偷改過", "tampered"], INVALID_SIGNATURE: ["簽章是假的", "fake signature"], 讀不到: ["讀不到", "unreadable"],
};
const 種類名 = { 代理網路描述檔: "agent network file", 網站描述檔: "site manifest", 簽章檔: "signature file" };
const 狀態名 = { 門外: "outside", 已包: "wrapped", 檢查中: "being checked", 已判定: "judged", 剪斷: "cut" };
const 事件名 = { 包: "wrap", 蓋章: "stamp", 判定: "judge", 剪斷: "cut" };
const 號 = (s) => (是英文 ? String(s).replace(/泡(\d+)/g, "b$1") : s);
const 意 = (碼) => 選(...(意思[碼] || [碼, 碼]));

const 色名 = { 綠: "綠", 黃: "黃", 待審: "待審", 拒: "拒" };
const 上色 = (el, 格) => { const k = 色名[格] || "灰"; el.style.setProperty("--色", `var(--${k})`); el.style.setProperty("--底色", `var(--${k}底)`); };
const el = (tag, cls, 文) => { const e = document.createElement(tag); if (cls) e.className = cls; if (文 != null) e.textContent = 文; return e; };

let 核 = null, 法 = null, 池 = null, 輪 = 0;
const 格字 = (格) => (是英文 ? 核.英文格(格) : 格);

function 畫泡泡(p) {
  const d = el("span", "泡泡" + (p.狀態 === "剪斷" ? " 斷" : ""));
  const 頭 = el("b", null, `${號(p.編號)}　${選(p.種類, 種類名[p.種類] || p.種類)}`);
  for (const 章 of p.章們) { const s = el("span", "章印", 格字(章.格)); 上色(s, 章.格); 頭.append(s); }
  if (p.決定) { const s = el("span", "章印", 選(`判：${p.決定}`, `verdict: ${格字(p.決定)}`)); 上色(s, p.決定); 頭.append(s); }
  d.append(頭, el("span", "指", (p.父編號 ? 選(`由 ${p.父編號} 帶進來`, `brought in by ${號(p.父編號)}`) : 選("第一個進門", "first through the door"))
    + 選(` · 內容指紋 ${p.內容指紋}`, ` · content fingerprint ${p.內容指紋}`)));
  d.append(el("span", "指", 選(`狀態：${p.狀態} · 鏈值 ${p.鏈}`, `state: ${狀態名[p.狀態] || p.狀態} · chain ${p.鏈}`)));
  return d;
}

async function 加站(名, 說, 泡泡們 = [], 環色 = "#6b7280") {
  const li = el("li", "站"); li.style.setProperty("--環", 環色);
  li.append(el("div", "站名", 名), el("div", "站說", 說));
  for (const p of 泡泡們) li.append(畫泡泡(p));
  $("管子").append(li);
  await 等(30); li.classList.add("到了"); li.scrollIntoView({ block: "nearest", behavior: 慢 ? "smooth" : "auto" });
  await 等(慢);
}

function 畫鏈() {
  const 鏈 = $("鏈"); 鏈.replaceChildren();
  const 層 = (p) => (p.父編號 ? 1 + 層(池.找(p.父編號)) : 0);
  for (const p of 池.泡泡們) {
    const d = el("div", "鏈節" + ["", " 子", " 孫"][Math.min(層(p), 2)]);
    d.append(el("div", null, 選(`${p.編號} ${p.種類}　${p.父編號 ? `← 接在 ${p.父編號} 後面` : "（繩頭）"}　狀態：${p.狀態}`,
      `${號(p.編號)} ${種類名[p.種類] || p.種類}　${p.父編號 ? `← hangs on ${號(p.父編號)}` : "(rope head)"}　state: ${狀態名[p.狀態] || p.狀態}`)));
    d.append(el("div", "指", 選(`扣環 ${p.歷程[0].接自} → `, `buckle ${p.歷程[0].接自} → `)
      + p.歷程.map((h) => `${選(h.事件, 事件名[h.事件] || h.事件)}:${h.鏈}`).join(" → ")));
    鏈.append(d);
  }
  const 總 = el("div", "總鏈");
  總.append(選("整條管子的總鏈值：", "Total chain of the whole pipe: "), el("code", null, 池.總鏈),
    選(`（共 ${池.總歷程.length} 件事）`, ` (${池.總歷程.length} events)`));
  鏈.append(總);
}

async function 走一遍(版本) {
  const 這輪 = ++輪;
  for (const b of document.querySelectorAll(".晶片")) b.setAttribute("aria-checked", String(b.dataset.名 === 版本.名));
  $("管子").replaceChildren(); $("鏈").replaceChildren(); $("驗結果").textContent = "";
  if (!核) $("管子").append(el("li", "空", 選("等檢查工具下載完就開始…", "Starting as soon as the checkers finish downloading…")));
  await 準備好;
  if (這輪 !== 輪) return;
  $("管子").replaceChildren();
  池 = new 核.泡泡池();
  const 基底 = new URL(`examples/${版本.名}/`, location.href);
  const 讀 = async (f) => { const r = await fetch(new URL(f, 基底), { cache: "no-store" }); if (!r.ok) throw new Error(`${f} (${r.status})`); return r.text(); };
  const 讀JSON = async (f) => JSON.parse(await 讀(f));
  const 來源 = `${location.origin}/examples/${版本.名}/`;
  const 名 = 選(版本.中文名, 版本.英文名.replace(/\s+/g, " "));

  await 加站(選("門外", "Outside"), 選(`夥伴網站（${名}）送來三種訊號：代理網路描述檔、網站描述檔、簽章檔。還沒被包起來的訊號，什麼都不能做。`,
    `The partner site (${名}) sends three signals: the agent network file, the site manifest, and the signature file. Nothing can act on a signal until it is wrapped.`));
  // 1 進門：每個訊號一進門就包泡泡；網站描述檔、簽章檔掛在代理網路描述檔的繩上
  const 根 = await 池.包({ 種類: "代理網路描述檔", 來源: 來源 + 版本.網路, 內容: await 讀(版本.網路) });
  const 描 = await 池.包({ 種類: "網站描述檔", 來源: 來源 + "agent-manifest.json", 內容: await 讀("agent-manifest.json") }, 根.編號);
  let 章檔 = null;
  try { 章檔 = await 池.包({ 種類: "簽章檔", 來源: 來源 + "agent-facts.signed.json", 內容: await 讀("agent-facts.signed.json") }, 根.編號); } catch { /* 沒有簽章檔 */ }
  if (這輪 !== 輪) return;
  await 加站(選("進門扣環：包泡泡", "Door buckle: wrap in bubbles"),
    章檔 ? 選("三個訊號各包成一顆泡泡，後兩顆掛在第一顆的繩上。", "Each of the three signals is wrapped in its own bubble; the last two hang on the first one's rope.")
      : 選("只有兩個訊號（這個網站沒有簽章檔），各包成一顆泡泡。", "Only two signals (this site has no signature file); each is wrapped in a bubble."),
    池.泡泡們.map((p) => ({ ...p, 章們: [...p.章們] })), "#2563eb");

  // 2 第一道檢查：進門檢查看代理網路描述檔
  const 門 = await 核.工具們["進門檢查（Agent Customs）"]({ 網路網址: new URL(網名, 基底).href, fetchImpl: fetch.bind(globalThis), pageOrigin: location.origin }).catch(() => ({ 代碼: "讀不到" }));
  const 門格 = 核.判定(法, { "進門檢查（Agent Customs）": 門.代碼 }).理由[0].格;
  await 池.蓋章(根.編號, { 器: "進門檢查", 代碼: 門.代碼, 格: 門格 });
  if (這輪 !== 輪) return;
  await 加站(選("第一道環：進門檢查（Agent Customs）", "Ring 1: entry check (Agent Customs)"),
    選(`讀 ${根.編號} 的指令有沒有藏壞東西 → ${意(門.代碼)}（${門.代碼}），法典換成「${門格}」，蓋在 ${根.編號} 上。`,
      `Reads ${號(根.編號)}'s instructions for hidden bad ones → ${意(門.代碼)} (${門.代碼}); the law maps it to ${格字(門格)}, stamped on ${號(根.編號)}.`),
    [{ ...根, 章們: [...根.章們] }], "#7c3aed");

  // 3 第二道檢查：真偽檢查看簽章檔（沒有簽章檔就蓋在繩頭上）
  const 真 = await 核.工具們["真偽檢查（NandaSeal）"]({ 讀JSON, 網路檔名: 版本.網路 }).catch(() => ({ 代碼: "讀不到" }));
  const 真格 = 核.判定(法, { "真偽檢查（NandaSeal）": 真.代碼 }).理由[0].格;
  const 蓋在 = 章檔 || 根;
  await 池.蓋章(蓋在.編號, { 器: "真偽檢查", 代碼: 真.代碼, 格: 真格 });
  if (這輪 !== 輪) return;
  await 加站(選("第二道環：真偽檢查（NandaSeal）", "Ring 2: signature check (NandaSeal)"),
    選(`比對 ${描.編號}、${根.編號} 和簽章 → ${意(真.代碼)}（${真.代碼}），法典換成「${真格}」，蓋在 ${蓋在.編號} 上。`,
      `Compares ${號(描.編號)}, ${號(根.編號)} and the signature → ${意(真.代碼)} (${真.代碼}); the law maps it to ${格字(真格)}, stamped on ${號(蓋在.編號)}.`),
    [{ ...蓋在, 章們: [...蓋在.章們] }], "#7c3aed");

  // 4 法典：整條繩上所有的章一起判，最壞的贏，判在繩頭上
  const { 決定 } = 核.判定(法, { "進門檢查（Agent Customs）": 門.代碼, "真偽檢查（NandaSeal）": 真.代碼 });
  await 池.判定(根.編號, 決定);
  if (這輪 !== 輪) return;
  await 加站(選("法典環：合成決定", "Law ring: combine"),
    選(`整條繩上的章：「${門格}」和「${真格}」，最壞的贏 → 判「${決定}」，寫在繩頭 ${根.編號} 上。`,
      `Stamps on the rope: ${格字(門格)} and ${格字(真格)}. The worst wins → ${格字(決定)}, written on the rope head ${號(根.編號)}.`),
    [{ ...根, 章們: [...根.章們] }], 決定 === "拒" ? "#c62828" : 決定 === "綠" ? "#1a7f37" : "#d35400");

  // 5 出口
  if (決定 === "拒") {
    const 斷 = await 池.剪斷(根.編號, "法典判拒");
    await 加站(選("出口：整條繩剪斷", "Exit: the whole rope is cut"),
      選(`${斷.join("、")} 全部剪斷。之後這條繩上再進來的訊號，一進門就被擋。`, `${斷.map(號).join(", ")} are all cut. Any later signal on this rope is blocked at the door.`),
      池.泡泡們.map((p) => ({ ...p })), "#c62828");
  } else {
    await 加站(選("出口：可以往下走", "Exit: may go on"),
      決定 === "綠" ? 選("放行。代理之後真的要動手做事時，還會再問你一次。", "Passed. When the agent actually wants to act, you will still be asked.")
        : 選(`判「${決定}」：放行前畫面會提醒你看一下。`, `${格字(決定)}: you get a warning before it passes.`),
      池.泡泡們.map((p) => ({ ...p })), 決定 === "綠" ? "#1a7f37" : "#d35400");
  }
  if (這輪 !== 輪) return;
  畫鏈();
  const [a, b] = [await 核.驗鏈(池.泡泡們), await 核.驗總鏈(池)];
  $("驗結果").className = "法狀態 " + (a.好 && b.好 ? "好" : "壞");
  $("驗結果").textContent = a.好 && b.好
    ? 選("現在驗鏈：每顆泡泡、整條管子的總鏈都對得上。按上面的按鈕試試竄改。", "Chain check now: every bubble and the total chain match. Use the buttons above to try tampering.")
    : 選("驗鏈失敗：", "Chain check failed: ") + 選(a.位置 || b.位置, 號(a.英文 || b.英文));
}

async function 試竄改(改, 名) {
  if (!池) { $("驗結果").textContent = 選("先選一個版本。", "Pick a version first."); return; }
  const 複本 = { 泡泡們: JSON.parse(JSON.stringify(池.泡泡們)), 總歷程: JSON.parse(JSON.stringify(池.總歷程)), 總鏈: 池.總鏈 };
  改(複本);
  const a = await 核.驗鏈(複本.泡泡們), b = a.好 ? await 核.驗總鏈(複本) : a;
  $("驗結果").className = "法狀態 " + (b.好 ? "壞" : "好");
  $("驗結果").textContent = b.好
    ? 選(`${名[0]}：竟然沒抓到！（這是漏洞，請回報）`, `${名[1]}: NOT caught! (this is a bug, please report it)`)
    : 選(`${名[0]} → 抓到了：${b.位置}（只改了一份複本，真的紀錄沒被動）`, `${名[1]} → caught: ${號(b.英文)} (only a copy was changed; the real record is untouched)`);
}

// 檢查工具和法典先在背景下載
const 準備好 = (async () => {
  const [模組, 文] = await Promise.all([載入核心(), fetch(是英文 ? "core/法典.en.txt" : "core/法典.txt", { cache: "no-store" }).then((r) => r.text())]);
  核 = 模組; 法 = 核.翻譯(文);
  $("載入").hidden = true;
})();
準備好.catch((e) => { $("載入").textContent = 選("載入失敗：", "Failed to load: ") + e.message; });

$("竄改章").addEventListener("click", () => 試竄改((c) => { const h = c.泡泡們[0].歷程.find((x) => x.事件 === "蓋章"); if (h) h.格 = "綠"; },
  ["把第一個章偷改成「綠」", "Secretly changing the first stamp to GREEN"]));
$("竄改來源").addEventListener("click", () => 試竄改((c) => { c.泡泡們[0].歷程[0].來源 = "https://好人.example/"; },
  ["把泡1 的來源偷改成好人網站", "Changing b1's source to a good site"]));
$("刪泡泡").addEventListener("click", () => 試竄改((c) => { c.泡泡們.pop(); }, ["把最後一顆泡泡整個刪掉", "Deleting the last bubble entirely"]));

// 版本按鈕先畫出來（只要一個很小的 JSON）
const 目錄 = await (await fetch("examples/目錄.json", { cache: "no-store" })).json();
const 跑 = (v) => 走一遍(v).catch((e) => { $("驗結果").textContent = 選("出錯：", "Error: ") + e.message; });
$("版本們").replaceChildren(...目錄.map((v) => {
  const b = el("button", "晶片", 選(v.中文名, v.英文名.replace(/\s+/g, " "))); b.type = "button"; b.dataset.名 = v.名;
  b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
  b.addEventListener("click", () => 跑(v));
  return b;
}));
// 從正面「帶我去」過來：網址帶 ?v=版本 就自動跑
const 指定 = 目錄.find((v) => v.名 === new URLSearchParams(location.search).get("v"));
if (指定) 跑(指定);
