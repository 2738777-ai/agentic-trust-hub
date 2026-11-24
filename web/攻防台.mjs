// 攻防台：評審用一句話當駭客 → 引擎（experiments/攻防循環/循環.mjs）真的跑 → 畫出攻擊、插座判決、防守方反應
import { 選, 是英文, 套用 } from "./語言.mjs";
import { 建世界, 駭客出手, 鬆開, 模式表 } from "../experiments/攻防循環/循環.mjs";

const 字典 = {
  $標題: ["萬用插座・攻防台", "Agentic Trust Hub · Attack & Defend"],
  小標: ["萬用插座 · 攻防台", "Agentic Trust Hub · Attack & Defend"],
  大標: ["換你當駭客，看插座當場補洞", "You play the attacker. Watch the hub patch itself."],
  安全: ["這裡打的是一間<b>假民宿</b>，整間都在你的瀏覽器裡：鑰匙、客戶都是假的，「送出去」的網址都是不存在的 <code>.invalid</code>，不會連到任何外面的地方。插座的判決是真的程式在跑。",
    "You are attacking a <b>fake guesthouse</b> that lives entirely in your browser. Keys and guests are fake; every \"send it out\" address is a non-existent <code>.invalid</code> domain, so nothing leaves this page. The hub's decisions are real code running."],
  模式名: ["防守模式", "Defense level"], 沒補強: ["沒補強", "No hardening"], 補強1: ["補強 1.0", "Hardening 1.0"], 補強2: ["補強 2.0", "Hardening 2.0"],
  恢復: ["恢復預設值", "Reset"], 指令名: ["駭客指令（用一句話說你要什麼）", "Attacker command (one sentence: what do you want?)"],
  出手: ["出手", "Attack"], 投影名: ["攻防投影", "Attack and defense map"], 過程名: ["駭客這一輪怎麼打", "How the attacker played this round"],
  防守名: ["防守方的狀態", "Defender status"], 鑰匙名: ["鑰匙", "Keys"], 收緊名: ["插座學起來的（法典被翻過來的格子）", "What the hub learned (law cells it flipped)"],
  繩名: ["最近一次的因果繩", "Latest causal chain"], 法典名: ["看現在的法典（被翻過的那幾行會亮）", "Show the current law (flipped lines are highlighted)"],
  底: ["引擎、法典和測試都在 <a href=\"https://github.com/2738777-ai/agentic-trust-hub/tree/main/experiments/攻防循環\">experiments/攻防循環</a>。駭客只會幾種固定的招式類別；評審的一句話會被翻成其中一種。",
    "Engine, laws and tests: <a href=\"https://github.com/2738777-ai/agentic-trust-hub/tree/main/experiments/攻防循環\">experiments/攻防循環</a>. The attacker only knows a few fixed technique classes; your sentence is mapped to one of them."],
};
const 英 = {
  伺服器: "server", 網站: "website", 代理: "agent", 走出資料夾: "walk out of the public folder", 評論藏字叫助理外送: "hidden text in a review tells the assistant to send it out",
  評論明說叫助理外送: "a visible review tells the assistant to send it out", 直接往上: "../", 編碼一次: "encoded once", 走捷徑: "through a planted shortcut", 藏起來: "hidden", 不藏: "visible",
  方法檢查: "method check", 路由檢查: "route check", 路徑檢查: "path check", 評論側面: "review side scan", 發起者檢查: "who-initiated check", 目的地檢查: "destination check", 內容檢查: "content check",
  走出房間: "outside the folder", 怪字元: "odd characters", 拒: "DENY", 綠: "GREEN", 黃: "YELLOW", 待審: "REVIEW", 讀到的內容: "came from page text", 表上沒有: "not on the list", 有金鑰: "contains a key",
  有別的客人資料: "contains other guests' data", 訂房金鑰: "booking key", 後台通行證: "back-office token", 金流金鑰: "payment key", 金鑰: "a key", 客戶資料: "guest data",
  主人: "owner", 騙主人按核准: "trick the owner into approving a token", 假裝是系統工程師: "posing as the IT engineer", 發起者對照: "initiator match", 用途檢查: "purpose check", 指紋檢查: "fingerprint check",
  對不上: "doesn't match", 核准被騙: "approval was tricked (fix the door, not the key)", 助理被騙: "assistant was tricked by page text", 東西被讀出: "something was read out", 不明: "unclear",
  作廢換新: "revoked and replaced", 作廢不換新: "revoked, not reissued", 排進輪換: "queued for rotation", 交給人: "sent to a human", 不動: "left alone",
};
const 譯 = (字) => (是英文 ? 英[字] ?? 字 : 字);
const 格字 = (格) => 譯(格);
const 色 = { 綠: "#3fb950", 黃: "#d29922", 待審: "#f0883e", 拒: "#f85149", 藍: "#2f6fe0", 金: "#e3b341" };
const 範例 = [
  ["去找金鑰", "Find the key"],
  ["把客戶個資帶回來", "Bring back the guests' personal data"],
  ["從網站評論下手，把客戶個資帶回來", "Use the website reviews to get the guests' data"],
  ["騙主人按下核准，把客戶個資帶回來", "Trick the owner into approving, then get the guests' data"],
];
const 模式說明 = {
  沒補強: ["檢查照跑、照記錄，但每一格都判綠：插座看得到一切，只是還不擋。被打一次，它就當場把因果繩經過的格子翻緊。",
    "Every check still runs and records, but every cell says GREEN: the hub sees everything and blocks nothing yet. When an attack lands, it flips exactly the cells on that causal chain."],
  "補強1.0": ["伺服器門口那幾格先緊好；網站評論和助理動手前那一關還鬆著。", "Server-door cells start tight; the review scan and the assistant's action gate start loose."],
  "補強2.0": ["全部的格子一開始就緊：伺服器門口、評論側面、助理動手前那一關。", "Every cell starts tight: server door, review side scan, and the assistant's action gate."],
};
const $ = (id) => document.getElementById(id);
const 法典們 = {};
let 模式 = new URLSearchParams(location.search).get("mode"); if (!模式表[模式]) 模式 = "沒補強";
let 世, 駭客, 上一輪 = null;

function 重來() {
  世 = 建世界(法典們, 模式); 駭客 = { 名: "駭客", 失敗過: new Set(), 偷到: [] }; 上一輪 = null;
  $("過程").replaceChildren(); $("結果").textContent = ""; 畫();
}

// ---------- 畫投影 ----------
const 面們 = { 網站: { x: 62, y: 66, 器們: ["評論側面"] }, 伺服器: { x: 180, y: 42, 器們: ["方法檢查", "路由檢查", "路徑檢查"] }, 代理: { x: 298, y: 66, 器們: ["發起者檢查", "目的地檢查", "內容檢查"] }, 主人: { x: 298, y: 196, 器們: ["發起者對照", "用途檢查", "指紋檢查"] } };
const 緊數 = (器們) => { let 緊 = 0, 共 = 0; for (const 字 of [世.法字.伺服器, 世.法字.動作, 世.法字.核准]) for (const l of 字.split("\n")) { const m = l.match(/^(\S+) 說 (\S+) → (\S+)/); if (m && 器們.includes(m[1])) { 共++; if (m[3] !== "綠" || 完整綠(m[1], m[2])) 緊++; } } return [緊, 共]; };
const 完整綠 = (器, 碼) => [法典們.伺服器, 法典們.動作, 法典們.核准].some((字) => 字.includes(`${器} 說 ${碼} → 綠`));
function 畫() {
  const svg = $("投影"), 插 = { x: 180, y: 160 };
  const 面狀態 = {};
  for (const 步 of 上一輪?.步們 ?? []) if (步.面) 面狀態[步.面] = 步.得手 ? "破" : 面狀態[步.面] ?? "擋";
  let s = `<polygon points="180,8 352,120 180,242 8,120" fill="#1a2430" stroke="#2b3846"/>`;
  for (const [名, 面] of Object.entries(面們)) s += `<line x1="${面.x}" y1="${面.y + 22}" x2="${插.x}" y2="${插.y - 10}" stroke="${色.金}" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/>`;
  for (const [名, 面] of Object.entries(面們)) {
    const 態 = 面狀態[名], 填 = 態 === "破" ? 色.拒 : 態 === "擋" ? "#8a6d1f" : 色.藍, [緊, 共] = 緊數(面.器們);
    s += `<rect x="${面.x - 36}" y="${面.y - 18}" width="72" height="44" rx="8" fill="${填}"/>
      <text x="${面.x}" y="${面.y + 1}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${選(名, 譯(名))}</text>
      <text x="${面.x}" y="${面.y + 18}" text-anchor="middle" font-size="11" fill="#e6edf3">${選(`補好 ${緊}/${共}`, `set ${緊}/${共}`)}</text>`;
    if (態) s += `<text x="${面.x}" y="${面.y - 24}" text-anchor="middle" font-size="12" font-weight="800" fill="${態 === "破" ? 色.拒 : 色.金}">${態 === "破" ? 選("被打穿", "breached") : 選("擋住", "blocked")}</text>`;
  }
  s += `<polygon points="${插.x},${插.y - 30} ${插.x + 34},${插.y + 16} ${插.x - 34},${插.y + 16}" fill="${色.金}"/>
    <text x="${插.x}" y="${插.y + 36}" text-anchor="middle" font-size="13" font-weight="800" fill="${色.金}">${選("萬用插座", "the hub")}</text>
    <text x="${插.x}" y="${插.y + 52}" text-anchor="middle" font-size="11" fill="#8796a5">${選(`學過 ${世.反應們.length} 次・放鬆 ${世.反應們.reduce((a, r) => a + r.放鬆, 0)}`, `learned ${世.反應們.length}× · loosened ${世.反應們.reduce((a, r) => a + r.放鬆, 0)}`)}</text>
    <text x="14" y="246" font-size="12" fill="#f0a39d">${選("駭客", "attacker")}：${選(`偷到 ${駭客.偷到.length} 把（`, `stole ${駭客.偷到.length} key(s) (`)}${選(`能用 ${能用數()} 把）`, `${能用數()} still work)`)}</text>`;
  svg.innerHTML = s;
  // 防守狀態
  $("模式說明").textContent = 選(...模式說明[模式]);
  document.querySelectorAll(".模式 button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.模式 === 模式)));
  $("鑰匙們").replaceChildren(...Object.entries(世.鑰匙們).map(([id, k]) => li(`${選(k.名, 譯(k.名.replace(/（.*/, "")) + (/（/.test(k.名) ? ` (${k.名.match(/#\d+/)[0]})` : ""))}`,
    k.停用 ? 選("被騙發出的，已停用（不換新）", "issued by a tricked approval: disabled, not reissued") : k.換過 ? 選(`被作廢、已換新 ${k.換過} 次`, `revoked and replaced ${k.換過}×`) : 世.待輪換.has(id) ? 選("繩子沒碰到，排進下次輪換", "not on the chain: queued for routine rotation") : 選("沒事", "untouched"))));
  const 翻們 = 世.反應們.flatMap((r) => r.翻了);
  $("翻了").replaceChildren(...(翻們.length ? 翻們.map((f) => { const e = document.createElement("li"); e.innerHTML = `${標籤(f.到)} ${譯(f.器)}「${譯(f.代碼)}」${格字(f.從)} → ${格字(f.到)}`; return e; }) : [li(選("還沒學到東西", "Nothing learned yet"), "")]));
  const 最近 = 世.反應們.at(-1);
  $("繩").replaceChildren(...(最近 ? 最近.繩.map((n) => { const e = document.createElement("li"); e.textContent = 描述(世.紀錄[n - 1]); return e; }) : []));
  $("其他").textContent = [世.警報們.length ? 選(`警報 ${世.警報們.length} 次`, `${世.警報們.length} alert(s)`) : 選("沒有警報", "No alerts"),
    世.待通知.size ? 選(`要通知 ${世.待通知.size} 位客戶（資料出去了收不回來）`, `${世.待通知.size} guests to notify (leaked data can't be taken back)`) : "",
    世.誘餌被碰 ? 選("誘餌客戶被碰到", "decoy guest record tripped") : ""].filter(Boolean).join("・");
  // 法典：被翻過的行亮起來
  const 底 = { 伺服器: 鬆開(法典們.伺服器, 模式表[模式]), 動作: 鬆開(法典們.動作, 模式表[模式]), 核准: 鬆開(法典們.核准, 模式表[模式]) };
  const 行們 = [];
  for (const 名 of ["伺服器", "動作", "核准"]) { const 舊 = 底[名].split("\n"); 世.法字[名].split("\n").forEach((l, i) => 行們.push(l !== 舊[i] ? `<mark>${跳脫(l)}</mark>` : 跳脫(l))); 行們.push(""); }
  $("法典").innerHTML = 行們.join("\n");
}
const 能用數 = () => 駭客.偷到.filter((v) => Object.values(世.鑰匙們).some((k) => k.值 === v)).length;
const 跳脫 = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const 標籤 = (格) => `<span class="標籤 ${格}">${格字(格)}</span>`;
function li(左, 右) { const e = document.createElement("li"); const a = document.createElement("span"); a.textContent = 左; const b = document.createElement("span"); b.textContent = 右; e.append(a, b); return e; }
function 描述(e) {
  if (!e) return "";
  if (e.類 === "請求") return `#${e.編號} ${e.來源 === "民宿助理" ? 選("民宿助理", "assistant") : 選("駭客", "attacker")}：${e.方法} ${decodeURI(e.路)}${e.含?.length ? 選(`（回應裡有：${e.含.map(譯).join("、")}）`, ` (response contained: ${e.含.map(譯).join(", ")})`) : ""}`;
  if (e.類 === "助理讀頁") return `#${e.編號} ${選(`助理讀民宿頁（評論 #${e.讀到評論.join("、#")}）`, `assistant reads the page (reviews #${e.讀到評論.join(", #")})`)}`;
  if (e.類 === "核准") return `#${e.編號} ${選(`主人按「好」核准申請 #${e.申請}（申請是「${e.發起來源}」發起的）`, `owner taps Approve on request #${e.申請} (started by "${e.發起來源 === "駭客" ? "attacker" : e.發起來源}")`)}`;
  if (e.類 === "請求" && e.申請) return `#${e.編號} ${選(`${e.來源}申請後台通行證`, `${e.來源 === "駭客" ? "attacker" : e.來源} requests a back-office token`)}`;
  if (e.類 === "助理動作") return `#${e.編號} ${選(`助理照做，送到 ${e.目的地}`, `assistant obeys and sends to ${e.目的地}`)}`;
  return `#${e.編號}`;
}

// ---------- 出手 ----------
function 出手() {
  const 句 = $("指令").value.trim(); if (!句) return;
  const 從 = 世.反應們.length;
  上一輪 = 駭客出手(世, 句, 駭客);
  const 表 = $("過程"); 表.replaceChildren();
  for (const 步 of 上一輪.步們) {
    const e = document.createElement("li"); if (步.得手) e.className = "得手";
    let 說 = 步.種 === "招" ? `${選(步.面, 譯(步.面))}・${選(步.類, 譯(步.類))}（${選(步.寫法, 譯(步.寫法))}）`
      : 步.種 === "舊鑰" ? 選(`拿之前偷到的鑰匙進後台`, "use a previously stolen key on the back office")
      : 步.種 === "新鑰" ? 選("拿剛偷到的鑰匙進後台", "use the key it just stole on the back office")
      : 選(`記得有 ${步.跳過數} 個洞已經被堵，不再試`, `remembers ${步.跳過數} holes are already closed and skips them`);
    const 擋 = 步.事.filter((x) => x.決定 && x.決定 !== "綠").map((x) => `${標籤(x.決定)}${x.類 === "助理動作" ? 選("助理動手前", "action gate") : x.類 === "核准" ? 選("核准關卡", "approval gate") : 選("門口", "door")}：${x.理由.map((r) => `${譯(r.器)}「${譯(r.代碼)}」${選(`第 ${r.行} 行`, `line ${r.行}`)}`).join("、")}`);
    if (步.事.some((x) => x.用了舊鑰)) 擋.push(標籤("拒") + 選("後台：這把鑰匙已經作廢", "back office: that key was revoked"));
    if (步.事.some((x) => x.駭客拿到)) 擋.push(選("主人信了，按下「好」：通行證發給駭客", "the owner believed it and tapped Approve: a token was issued to the attacker"));
    for (const x of 步.事.filter((x) => x.下架評論)) 擋.push(選(`評論 #${x.下架評論} 被下架`, `review #${x.下架評論} taken down`));
    e.innerHTML = `${步.得手 ? `<span class="標籤 拒">${選("被偷", "stolen")}</span>` : `<span class="標籤 綠">${選("沒得手", "failed")}</span>`} ${跳脫(說)}${擋.length ? "<br>　" + 擋.join("<br>　") : ""}`;
    表.append(e);
  }
  const 新反應 = 世.反應們.slice(從);
  for (const r of 新反應) {
    const e = document.createElement("li"), 動到 = r.凍結們.filter((f) => f.決定 === "拒");
    e.innerHTML = `<b>${選("防守方", "Defender")}</b>：${選(`診斷「${r.診斷}」；追繩，收緊 ${r.翻了.length} 格（放鬆 ${r.放鬆}）；`, `diagnosis: ${譯(r.診斷)}; traced the chain, tightened ${r.翻了.length} cell(s) (loosened ${r.放鬆}); `)}` +
      (動到.length ? 動到.map((f) => 選(`${f.名}${f.處置}`, `${譯(f.名.replace(/（.*/, ""))}${/（/.test(f.名) ? " (" + f.名.match(/#\d+/)[0] + ")" : ""}: ${譯(f.處置)}`)).join(選("、", "; ")) : 選("沒有鑰匙被碰到", "no key on the chain"));
    表.append(e);
  }
  const 破面 = 上一輪.步們.find((步) => 步.得手 && 步.面)?.面, 擋過 = 上一輪.步們.filter((步) => 步.種 === "招" && !步.得手).length;
  const 從處 = 破面 ? 選(`從「${破面}」`, ` via the ${譯(破面)}`) : "";
  const 前情 = 擋過 && 破面 ? 選(`前面 ${擋過} 招被擋，`, `${擋過} earlier ${擋過 > 1 ? "tries were" : "try was"} blocked, then: `) : "";
  const 果 = { "得手": 選(`${前情}駭客${從處}得手：資料出去了。插座已經當場補洞，再打一次試試。`, `${前情}Breach${從處}: the data got out. The hub has already patched it. Try the same sentence again.`),
    "得手且能用": 選("駭客得手，而且鑰匙還能用。", "Breach, and the key still works."),
    "拿到了，但已經被作廢": 選("駭客拿到鑰匙了，但插座當場作廢，拿去用進不了門。", "The attacker grabbed a key, but the hub revoked it on the spot. It's useless."),
  }[上一輪.結果] ?? 選("駭客沒得手。", "The attacker failed.");
  $("結果").textContent = 果; $("結果").style.color = /得手/.test(上一輪.結果) && !/作廢/.test(上一輪.結果) ? 色.拒 : /作廢/.test(上一輪.結果) ? 色.金 : 色.綠;
  畫();
}

// ---------- 開始 ----------
套用(字典);
$("指令").value = 選(...範例[0]);
$("範例們").replaceChildren(...範例.map((句) => { const b = document.createElement("button"); b.type = "button"; b.textContent = 選(...句); b.addEventListener("click", () => ($("指令").value = 選(...句))); return b; }));
$("出手").addEventListener("click", 出手);
$("恢復").addEventListener("click", 重來);
document.querySelectorAll(".模式 button").forEach((b) => b.addEventListener("click", () => {
  模式 = b.dataset.模式; const u = new URL(location.href); u.searchParams.set("mode", 模式); history.replaceState(null, "", u); 重來();
}));
$("出手").disabled = true;
const 根 = new URL("../experiments/攻防循環/", import.meta.url);
Promise.all([["伺服器", "民宿伺服器法典.txt"], ["動作", "動作關卡法典.txt"], ["凍結", "凍結法典.txt"], ["核准", "核准法典.txt"]].map(async ([名, 檔]) => (法典們[名] = await (await fetch(new URL(檔, 根))).text())))
  .then(() => { 重來(); $("出手").disabled = false; });
