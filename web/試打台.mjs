// 試打台：選一個網站版本 → 兩個檢查工具在你的瀏覽器裡各跑一次 → 照白話法典合成一個決定。
// 畫面先出來（只靠很小的語言檔），檢查工具在背景下載，下載完才真的開始檢查。
import { 是英文, 選, 套用, 載入核心 } from "./語言.mjs";

const $ = (id) => document.getElementById(id);
const 網名 = "tidewhistle_guesthouse";

套用({
  $標題: ["萬用插座 試打台", "Agentic Trust Hub — Try it"],
  標題: ["萬用插座 <span>試打台</span>", "Agentic Trust Hub <span>try it</span>"],
  副: ["把別人做的檢查工具接在一起，由一張<b>白話法典</b>決定放不放行。",
    "Plug independent trust checkers together. One <b>plain-language law</b> decides whether a stranger agent's site gets in."],
  去側面: ["看側面：訊號是怎麼進來的 →", "Side view: how each signal gets in →"],
  去視角台: ["視角台：換角度看駭客怎麼跑 →", "Views: watch the attack from different angles →"],
  去直播: ["▶ 先看 30 秒直播：駭客出手，當場被抓", "▶ Watch the 30-second live demo: an attack, caught on the spot"],
  導覽標題: ["一分鐘玩法", "One-minute tour"],
  步1: ["按「Ｃ 壞人自己簽章」：真偽檢查說簽章是真的（綠），只靠它就會放行；進門檢查抓到壞指令（拒）。合起來，最壞的贏：<b>拒</b>。",
    "Pick <b>C — Attacker signs it</b>. The signature checker says the signature is real (GREEN), so on its own it would let the site in. The entry checker finds the injected instruction (DENY). Combined, the worst wins: <b>DENY</b>."],
  步2: ["改法典一行：把 DENIED 那行從「拒」改成「待審」。這是在放鬆規則，插座會先攔下來，告訴你哪幾格變寬鬆；再按一次「確定放鬆」才生效。換規則不用改程式，但規則不准偷偷變鬆。",
    "Change one line of the law: map DENIED to REVIEW instead of DENY. That loosens the rules, so the hub stops first and shows which cells got looser; press \"Confirm loosening\" to apply it. No code changes, but rules never loosen silently."],
  步3: ["看側面：每個訊號一進門就被包成泡泡，一路蓋章串成因果鏈；判「拒」整條繩剪斷。再試著竄改紀錄，會被抓到。",
    "Open the side view: every incoming signal is wrapped in a bubble at the door, stamped at each check, and chained by cause. A DENY cuts the whole rope. Then try to tamper with the record — it gets caught."],
  幫我按: ["幫我按", "Do it"], 幫我改: ["幫我改", "Do it"], 帶我去: ["帶我去", "Go"],
  選標題: ["① 選一個網站版本", "① Pick a version of the site"],
  選提示: ["都是比賽官方範例那間民宿，有的被動過手腳。", "All are the official example guesthouse from the challenge. Some have been tampered with."],
  版本標籤: ["網站版本", "Site version"],
  載入中: ["檢查工具下載中（約 100 KB），可以先選版本…", "Downloading the checkers (about 100 KB). You can pick a version now…"],
  果標題: ["② 兩個檢查工具怎麼說", "② What the two checkers say"],
  果提示: ["選一個版本就會開始檢查。", "Pick a version to start."],
  法標題: ["③ 白話法典（可以直接改）", "③ The plain-language law (edit it)"],
  法提示: ["改完按「照新法典重判」。翻譯器看不懂、前後矛盾、寫了尺上沒有的格，會停下來告訴你第幾行。",
    "Edit, then press “Re-judge with this law”. If a line can't be read, contradicts another line, or uses a level not on the scale, the translator stops and tells you the line number."],
  法典標籤: ["白話法典", "Plain-language law"],
  重判: ["照新法典重判", "Re-judge with this law"], 還原: ["還原", "Reset"],
  是標題: ["這是什麼", "What is this"],
  是內容: [null, `<li>The open agentic web lets stranger AI agents walk into a site. Each trust checker covers one slice: one looks for hidden bad instructions, another checks whether the signed manifest was changed.</li>
<li>The hub plugs them into one line. Every result is mapped onto one scale (GREEN, YELLOW, REVIEW, DENY); the worst wins, and a result that can't be read counts as DENY (fail closed).</li>
<li>To plug in a new checker, add a few lines to the law — no code. Every edit is checked against every combination, so a loophole can't be written in.</li>
<li>Same core as a command line: <code>node cli/插座.mjs 檢查 examples/C_self_signed</code></li>`],
  借用: [null, `Borrowed open-source checkers: <a href="https://github.com/montbaga/agent-customs">Agent Customs</a> (Apache 2.0), <a href="https://github.com/cocvn157/nanda-seal">NandaSeal</a> (MIT). Demo site from the <a href="https://github.com/cognizant-ai-labs/agentic-web">official Open Agentic Web example</a> (Apache 2.0).`],
  原始碼: ["原始碼", "Source code"],
  助標題: ["④ 問插座的助手（代理網站）", "④ Ask the hub's assistant (this page is an agent website)"],
  助說明: ["這一頁本身也是開放代理網站：助手在你的瀏覽器裡跑，用的就是上面同一份引擎和法典。可以請它檢查示範網站、解釋法典，或審查別人想改的規則安不安全。",
    "This page is itself an open agentic website. The assistant runs in your browser with the same engine and law as above. Ask it to check a demo site, explain the law, or audit whether a proposed rule change is safe."],
  助注意: ["你打的字和這一頁的資料會送到你在下方設定選的 AI 服務。助手只能判斷，不能改任何東西。",
    "Your messages and this page's data go to the AI provider set below. The assistant can only judge; it changes nothing."],
});

// 代碼的意思（只用來顯示；放不放行看法典，不看這裡）
const 意思 = {
  CLEARED: ["放行", "cleared"], CONDITIONS: ["有條件放行", "allowed with conditions"], HOLD: ["先停下來等人看", "hold for a human"],
  DENIED: ["拒絕進門", "denied entry"], INVALID: ["格式不對", "invalid format"], UNREADABLE: ["讀不到", "unreadable"],
  VERIFIED: ["簽章是真的", "signature is real"], MISSING_FACTS: ["沒有簽章", "no signature"], EXPIRED: ["簽章過期", "signature expired"],
  TAMPERED: ["被偷改過", "tampered"], INVALID_SIGNATURE: ["簽章是假的", "fake signature"], 讀不到: ["工具出錯，讀不到結果", "the checker failed; no result"],
};
const 器名 = { "進門檢查（Agent Customs）": "Entry check (Agent Customs)", "真偽檢查（NandaSeal）": "Signature check (NandaSeal)" };
const 決定話 = {
  綠: ["兩邊都說沒問題，可以讓它進來（動手前還是會問你）。", "Both checkers are fine with it. It may come in (you'll still be asked before it acts)."],
  黃: ["沒有發現壞東西，但少了一樣證明，畫面上會提醒你。", "Nothing bad found, but one proof is missing. You'll see a warning."],
  待審: ["有一個工具說要先停下來，等人看過再說。", "One checker says stop until a human looks at it."],
  拒: ["至少有一個工具說不行，最壞的那一格贏，所以不讓它進來。", "At least one checker says no. The worst wins, so it stays out."],
};
const 格色 = { 綠: "綠", 黃: "黃", 待審: "待審", 拒: "拒" };
const 上色 = (el, 格) => {
  const k = 格色[格] || "灰";
  el.style.setProperty("--色", `var(--${k})`);
  el.style.setProperty("--底色", `var(--${k}底)`);
};
const 新 = (tag, cls, 文) => { const e = document.createElement(tag); if (cls) e.className = cls; if (文 != null) e.textContent = 文; return e; };

let 核 = null, 原法典 = "", 法 = null, 目錄 = [], 選中 = null, 上次結果 = null;
const 格字 = (格) => (是英文 && 核 ? 核.英文格(格) : 格);

// 換法典：先翻譯、窮舉；再和現在的法典比鬆緊。放鬆的格子不准偷偷生效，要再按一次（紅隊第 1 招的補丁）
let 待確認 = null;
function 換法典(文字) {
  const 狀 = $("法狀態");
  try {
    const 新法 = 核.翻譯(文字);
    const r = 核.窮舉檢查(新法);
    if (r.違反.length) throw new 核.法典錯誤(`窮舉找到 ${r.違反.length} 個違反：${r.違反[0][0]}`, `Exhaustive check found ${r.違反.length} violation(s)`);
    const 比 = 法 ? 核.比鬆緊(法, 新法) : { 放鬆: [], 收緊: [] };
    if (比.要人看 && 待確認 !== 文字) {
      待確認 = 文字;
      const 例 = 比.放鬆.slice(0, 3).map((x) => `${Object.values(x.組).join(選("＋", " + "))}${選("：", ": ")}${格字(x.舊)} → ${格字(x.新)}${選(`（${x.原因}）`, ` (${({尺變了:"scale changed",補上新代碼:"new code added",拔掉工具:"checker removed",改寬:"mapped looser"})[x.原因]})`)}`).join(選("；", "; "));
      狀.className = "法狀態 警";
      const 尺話 = 比.尺有變 ? 選("尺本身被改了（格的名字、格數或順序）。", "The scale itself changed (level names, count or order). ") : "";
      狀.textContent = 尺話 + (比.放鬆.length ? 選(`這份法典讓 ${比.放鬆.length} 格變寬鬆（${例}）。`, `This law loosens ${比.放鬆.length} cell(s) (${例}). `) : "")
        + 選("放鬆和改尺都不會自動生效：看清楚是你自己要改的，再按一次「確定放鬆」。", "Loosening and scale changes never apply silently: if you really meant it, press \"Confirm loosening\".");
      $("重判").textContent = 選("確定放鬆", "Confirm loosening");
      return false;
    }
    待確認 = null; $("重判").textContent = 選("照新法典重判", "Re-judge with this law");
    法 = 新法;
    狀.className = "法狀態 好";
    const 鬆緊話 = 比.放鬆.length ? 選(`你確認了放鬆 ${比.放鬆.length} 格。`, `You confirmed loosening ${比.放鬆.length} cell(s). `)
      : 比.收緊.length ? 選(`收緊 ${比.收緊.length} 格，直接生效。`, `Tightened ${比.收緊.length} cell(s), applied right away. `) : "";
    狀.textContent = 鬆緊話 + 選(`翻譯成功：${r.工具數} 個檢查工具、${r.規則數} 條規則；窮舉 ${r.組合數} 種組合，違反 0 次。`,
      `Translated: ${r.工具數} checkers, ${r.規則數} rules. All ${r.組合數} combinations checked, 0 violations.`);
    return true;
  } catch (e) {
    待確認 = null; $("重判").textContent = 選("照新法典重判", "Re-judge with this law");
    狀.className = "法狀態 壞";
    狀.textContent = 選("停下來了：" + e.message + "（判定還是用上一份沒問題的法典）",
      "Stopped: " + (e.英文 || e.message) + " (still judging with the last good law)");
    return false;
  }
}

function 畫結果() {
  const 章們 = $("章們"), 決 = $("決定");
  if (!上次結果) return;
  const { 結果們, 說明們 } = 上次結果;
  const { 決定, 理由 } = 核.判定(法, 結果們);
  章們.replaceChildren(...理由.map((r) => {
    const d = 新("div", "章"); 上色(d, r.格);
    const 碼 = 新("div", "碼", 選(...(意思[r.代碼] || [r.代碼, r.代碼])));
    碼.append(新("em", null, r.代碼));
    const 行 = 新("div", "行", r.行
      ? 選(`法典第 ${r.行} 行：${r.代碼} → ${r.格}`, `Law line ${r.行}: ${r.代碼} → ${格字(r.格)}`)
      : 選(`法典沒寫這個代碼，照「讀不到結果」當成「${r.格}」`, `The law doesn't list this code, so it counts as "unreadable" → ${格字(r.格)}`));
    d.append(新("span", "格", 格字(r.格)), 新("div", "器", 選(r.器, 器名[r.器] || r.器)), 碼, 行);
    const 原文 = 說明們[r.器] || "";
    if (原文 && 原文 !== r.代碼) {   // 工具自己的說明是英文：中文畫面收起來，英文畫面直接給
      const 細 = 新("details", "細"); 細.open = 是英文;
      細.append(新("summary", null, 選("工具自己的說明（英文原文）", "What the checker says")), 新("div", null, 原文));
      d.append(細);
    }
    return d;
  }));
  決.hidden = false; 決.className = "決定"; 上色(決, 決定);
  決.replaceChildren(新("div", "大", 格字(決定)), 新("div", "小", 決定話[決定] ? 選(...決定話[決定]) : 格字(決定)));
}

async function 檢查(版本) {
  選中 = 版本.名;
  for (const b of document.querySelectorAll(".版本")) b.setAttribute("aria-checked", String(b.dataset.名 === 選中));
  $("章們").replaceChildren(新("p", "提示", 核 ? 選("兩個工具正在你的瀏覽器裡檢查…", "Both checkers are running in your browser…")
    : 選("等檢查工具下載完就開始…", "Starting as soon as the checkers finish downloading…")));
  $("決定").hidden = true;
  await 準備好;
  const 基底 = new URL(`examples/${版本.名}/`, location.href);
  const 讀JSON = async (f) => {
    const r = await fetch(new URL(f, 基底), { cache: "no-store" });
    if (!r.ok) throw new Error(`${f} (${r.status})`);
    return r.json();
  };
  const 結果 = await 核.全部檢查({
    網路網址: new URL(網名, 基底).href, fetchImpl: globalThis.fetch.bind(globalThis), pageOrigin: location.origin,
    讀JSON, 網路檔名: 版本.網路,
  });
  if (選中 !== 版本.名) return;   // 檢查途中又點了別的
  上次結果 = 結果;
  畫結果();
}

// 一分鐘玩法的按鈕
function 跑版本(名) {
  const v = 目錄.find((x) => x.名 === 名);
  if (v) { document.querySelector(`.版本[data-名="${名}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }); return 檢查(v); }
}
async function 改一行() {
  await 準備好;
  if (!上次結果) await 跑版本("C_self_signed");
  const 框 = $("法典");
  框.value = 框.value.replace(/(DENIED\s*→\s*)(拒|DENY)/, (_, a, b) => a + (b === "拒" ? "待審" : "REVIEW"));
  if (換法典(框.value)) 畫結果();   // 這是放鬆：第一次只會攔下來，要再按「確定放鬆」
  $("法狀態").scrollIntoView({ block: "center", behavior: "smooth" });
}

// 檢查工具先開始在背景下載，同時畫版本按鈕（只要一個很小的 JSON）
const 準備好 = (async () => {
  const [模組, 文] = await Promise.all([載入核心(), fetch(是英文 ? "core/法典.en.txt" : "core/法典.txt", { cache: "no-store" }).then((r) => r.text())]);
  核 = 模組; 原法典 = 文;
  $("法典").value = 原法典;
  換法典(原法典);
  $("載入").hidden = true;
  $("重判").addEventListener("click", () => { if (換法典($("法典").value)) 畫結果(); });
  $("還原").addEventListener("click", () => { $("法典").value = 原法典; 換法典(原法典); 畫結果(); });
})();
準備好.catch((e) => { $("載入").textContent = 選("載入失敗：", "Failed to load: ") + e.message; });

目錄 = await (await fetch("examples/目錄.json", { cache: "no-store" })).json();
$("版本們").replaceChildren(...目錄.map((v) => {
  const b = 新("button", "版本"); b.type = "button"; b.dataset.名 = v.名;
  b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
  b.append(新("b", null, 選(v.中文名, v.英文名)), 新("small", null, 選(v.說明, v.英文說明)));
  b.addEventListener("click", () => 檢查(v));
  return b;
}));
$("步1").addEventListener("click", () => 跑版本("C_self_signed"));
$("步2").addEventListener("click", 改一行);
if (是英文) $("步3").href = "side.html?v=C_self_signed&lang=en";
