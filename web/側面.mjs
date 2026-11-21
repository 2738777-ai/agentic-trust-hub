// 側面：把「訊號怎麼進來」畫成一根剖開的管子。每個訊號一進門就包泡泡，每道檢查蓋章，法典判定，拒就整條繩剪斷。
import { 翻譯, 判定 } from "../core/翻譯器.mjs";
import { 工具們 } from "../core/工具.mjs";
import { 泡泡池, 驗鏈, 驗總鏈 } from "../core/泡泡.mjs";

const $ = (id) => document.getElementById(id);
const 網名 = "tidewhistle_guesthouse";
const 慢 = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
const 等 = (ms) => new Promise((r) => setTimeout(r, ms));
const 中文 = {
  CLEARED: "放行", CONDITIONS: "有條件放行", HOLD: "先停下來", DENIED: "拒絕進門", INVALID: "格式不對", UNREADABLE: "讀不到",
  VERIFIED: "簽章是真的", MISSING_FACTS: "沒有簽章", EXPIRED: "簽章過期", TAMPERED: "被偷改過", INVALID_SIGNATURE: "簽章是假的", 讀不到: "讀不到",
};
const 色名 = { 綠: "綠", 黃: "黃", 待審: "待審", 拒: "拒" };
const 上色 = (el, 格) => { const k = 色名[格] || "灰"; el.style.setProperty("--色", `var(--${k})`); el.style.setProperty("--底色", `var(--${k}底)`); };
const el = (tag, cls, 文) => { const e = document.createElement(tag); if (cls) e.className = cls; if (文 != null) e.textContent = 文; return e; };

let 法 = null, 池 = null, 輪 = 0;

function 畫泡泡(p) {
  const d = el("span", "泡泡" + (p.狀態 === "剪斷" ? " 斷" : ""));
  const 頭 = el("b", null, `${p.編號}　${p.種類}`);
  for (const 章 of p.章們) { const s = el("span", "章印", `${章.格}`); 上色(s, 章.格); 頭.append(s); }
  if (p.決定) { const s = el("span", "章印", `判：${p.決定}`); 上色(s, p.決定); 頭.append(s); }
  d.append(頭, el("span", "指", `${p.父編號 ? `由 ${p.父編號} 帶進來 · ` : "第一個進門 · "}內容指紋 ${p.內容指紋}`));
  d.append(el("span", "指", `狀態：${p.狀態} · 鏈值 ${p.鏈}`));
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
    d.append(el("div", null, `${p.編號} ${p.種類}　${p.父編號 ? `← 接在 ${p.父編號} 後面` : "（繩頭）"}　狀態：${p.狀態}`));
    d.append(el("div", "指", `扣環 ${p.歷程[0].接自} → ` + p.歷程.map((h) => `${h.事件}:${h.鏈}`).join(" → ")));
    鏈.append(d);
  }
  const 總 = el("div", "總鏈"); 總.append("整條管子的總鏈值：", el("code", null, 池.總鏈), `（共 ${池.總歷程.length} 件事）`);
  鏈.append(總);
}

async function 走一遍(版本) {
  const 這輪 = ++輪;
  for (const b of document.querySelectorAll(".晶片")) b.setAttribute("aria-checked", String(b.dataset.名 === 版本.名));
  $("管子").replaceChildren(); $("鏈").replaceChildren(); $("驗結果").textContent = "";
  池 = new 泡泡池();
  const 基底 = new URL(`examples/${版本.名}/`, location.href);
  const 讀 = async (f) => { const r = await fetch(new URL(f, 基底), { cache: "no-store" }); if (!r.ok) throw new Error(`${f} 讀不到`); return r.text(); };
  const 讀JSON = async (f) => JSON.parse(await 讀(f));
  const 來源 = `${location.origin}/examples/${版本.名}/`;

  await 加站("門外", `夥伴網站（${版本.中文名}）送來三種訊號：代理網路描述檔、網站描述檔、簽章檔。還沒被包起來的訊號，什麼都不能做。`);
  // 1 進門：每個訊號一進門就包泡泡；網站描述檔、簽章檔掛在代理網路描述檔的繩上
  const 根 = await 池.包({ 種類: "代理網路描述檔", 來源: 來源 + 版本.網路, 內容: await 讀(版本.網路) });
  const 描 = await 池.包({ 種類: "網站描述檔", 來源: 來源 + "agent-manifest.json", 內容: await 讀("agent-manifest.json") }, 根.編號);
  let 章檔 = null;
  try { 章檔 = await 池.包({ 種類: "簽章檔", 來源: 來源 + "agent-facts.signed.json", 內容: await 讀("agent-facts.signed.json") }, 根.編號); } catch { /* 沒有簽章檔 */ }
  if (這輪 !== 輪) return;
  await 加站("進門扣環：包泡泡", 章檔 ? "三個訊號各包成一顆泡泡，後兩顆掛在第一顆的繩上。" : "只有兩個訊號（這個網站沒有簽章檔），各包成一顆泡泡。",
    池.泡泡們.map((p) => ({ ...p, 章們: [...p.章們] })), "#2563eb");

  // 2 第一道檢查：進門檢查看代理網路描述檔
  const 門 = await 工具們["進門檢查（Agent Customs）"]({ 網路網址: new URL(網名, 基底).href, fetchImpl: fetch.bind(globalThis), pageOrigin: location.origin }).catch(() => ({ 代碼: "讀不到" }));
  const 門格 = 判定(法, { "進門檢查（Agent Customs）": 門.代碼 }).理由[0].格;
  await 池.蓋章(根.編號, { 器: "進門檢查", 代碼: 門.代碼, 格: 門格 });
  if (這輪 !== 輪) return;
  await 加站("第一道環：進門檢查（Agent Customs）", `讀 ${根.編號} 的指令有沒有藏壞東西 → ${中文[門.代碼] || 門.代碼}（${門.代碼}），法典換成「${門格}」，蓋在 ${根.編號} 上。`,
    [{ ...根, 章們: [...根.章們] }], "#7c3aed");

  // 3 第二道檢查：真偽檢查看簽章檔（沒有簽章檔就蓋在繩頭上）
  const 真 = await 工具們["真偽檢查（NandaSeal）"]({ 讀JSON, 網路檔名: 版本.網路 }).catch(() => ({ 代碼: "讀不到" }));
  const 真格 = 判定(法, { "真偽檢查（NandaSeal）": 真.代碼 }).理由[0].格;
  const 蓋在 = 章檔 || 根;
  await 池.蓋章(蓋在.編號, { 器: "真偽檢查", 代碼: 真.代碼, 格: 真格 });
  if (這輪 !== 輪) return;
  await 加站("第二道環：真偽檢查（NandaSeal）", `比對 ${描.編號}、${根.編號} 和簽章 → ${中文[真.代碼] || 真.代碼}（${真.代碼}），法典換成「${真格}」，蓋在 ${蓋在.編號} 上。`,
    [{ ...蓋在, 章們: [...蓋在.章們] }], "#7c3aed");

  // 4 法典：整條繩上所有的章一起判，最壞的贏，判在繩頭上
  const { 決定 } = 判定(法, { "進門檢查（Agent Customs）": 門.代碼, "真偽檢查（NandaSeal）": 真.代碼 });
  await 池.判定(根.編號, 決定);
  if (這輪 !== 輪) return;
  await 加站("法典環：合成決定", `整條繩上的章：「${門格}」和「${真格}」，最壞的贏 → 判「${決定}」，寫在繩頭 ${根.編號} 上。`,
    [{ ...根, 章們: [...根.章們] }], 決定 === "拒" ? "#c62828" : 決定 === "綠" ? "#1a7f37" : "#d35400");

  // 5 出口
  if (決定 === "拒") {
    const 斷 = await 池.剪斷(根.編號, "法典判拒");
    await 加站("出口：整條繩剪斷", `${斷.join("、")} 全部剪斷。之後這條繩上再進來的訊號，一進門就被擋。`, 池.泡泡們.map((p) => ({ ...p })), "#c62828");
  } else {
    await 加站("出口：可以往下走", 決定 === "綠" ? "放行。代理之後真的要動手做事時，還會再問你一次。" : `判「${決定}」：放行前畫面會提醒你看一下。`,
      池.泡泡們.map((p) => ({ ...p })), 決定 === "綠" ? "#1a7f37" : "#d35400");
  }
  if (這輪 !== 輪) return;
  畫鏈();
  const [a, b] = [await 驗鏈(池.泡泡們), await 驗總鏈(池)];
  $("驗結果").className = "法狀態 " + (a.好 && b.好 ? "好" : "壞");
  $("驗結果").textContent = a.好 && b.好 ? "現在驗鏈：每顆泡泡、整條管子的總鏈都對得上。按上面的按鈕試試竄改。" : `驗鏈失敗：${a.位置 || b.位置}`;
}

async function 試竄改(改, 名) {
  if (!池) return;
  const 複本 = { 泡泡們: JSON.parse(JSON.stringify(池.泡泡們)), 總歷程: JSON.parse(JSON.stringify(池.總歷程)), 總鏈: 池.總鏈 };
  改(複本);
  const a = await 驗鏈(複本.泡泡們), b = a.好 ? await 驗總鏈(複本) : a;
  $("驗結果").className = "法狀態 " + (b.好 ? "壞" : "好");
  $("驗結果").textContent = b.好 ? `${名}：竟然沒抓到！（這是漏洞，請回報）` : `${名} → 抓到了：${b.位置}（只改了一份複本，真的紀錄沒被動）`;
}

async function 開始() {
  法 = 翻譯(await (await fetch("core/法典.txt", { cache: "no-store" })).text());
  const 目錄 = await (await fetch("examples/目錄.json", { cache: "no-store" })).json();
  $("版本們").replaceChildren(...目錄.map((v) => {
    const b = el("button", "晶片", v.中文名); b.type = "button"; b.dataset.名 = v.名;
    b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
    b.addEventListener("click", () => 走一遍(v).catch((e) => { $("驗結果").textContent = "出錯：" + e.message; }));
    return b;
  }));
  $("竄改章").addEventListener("click", () => 試竄改((c) => { const h = c.泡泡們[0].歷程.find((x) => x.事件 === "蓋章"); if (h) h.格 = "綠"; }, "把第一個章偷改成「綠」"));
  $("竄改來源").addEventListener("click", () => 試竄改((c) => { c.泡泡們[0].歷程[0].來源 = "https://好人.example/"; }, "把泡1 的來源偷改成好人網站"));
  $("刪泡泡").addEventListener("click", () => 試竄改((c) => { c.泡泡們.pop(); }, "把最後一顆泡泡整個刪掉"));
}
開始().catch((e) => { $("管子").textContent = "載入失敗：" + e.message; });
