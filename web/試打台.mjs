// 試打台：選一個網站版本 → 兩個檢查工具在你的瀏覽器裡各跑一次 → 照白話法典合成一個決定。
import { 翻譯, 判定, 窮舉檢查, 法典錯誤 } from "../core/翻譯器.mjs";
import { 全部檢查 } from "../core/工具.mjs";

const $ = (id) => document.getElementById(id);
const 網名 = "tidewhistle_guesthouse";

// 代碼的中文意思（只用來顯示；放不放行看法典，不看這裡）
const 中文 = {
  CLEARED: "放行", CONDITIONS: "有條件放行", HOLD: "先停下來等人看", DENIED: "拒絕進門", INVALID: "格式不對", UNREADABLE: "讀不到",
  VERIFIED: "簽章是真的", MISSING_FACTS: "沒有簽章", EXPIRED: "簽章過期", TAMPERED: "被偷改過", INVALID_SIGNATURE: "簽章是假的",
  讀不到: "工具出錯，讀不到結果",
};
const 格色 = { 綠: "綠", 黃: "黃", 待審: "待審", 拒: "拒" };
const 決定話 = {
  綠: "兩邊都說沒問題，可以讓它進來（動手前還是會問你）。",
  黃: "沒有發現壞東西，但少了一樣證明，畫面上會提醒你。",
  待審: "有一個工具說要先停下來，等人看過再說。",
  拒: "至少有一個工具說不行，最壞的那一格贏，所以不讓它進來。",
};
const 上色 = (el, 格) => {
  const k = 格色[格] || "灰";
  el.style.setProperty("--色", `var(--${k})`);
  el.style.setProperty("--底色", `var(--${k}底)`);
};

let 原法典 = "", 法 = null, 目錄 = [], 選中 = null, 上次結果 = null;

function 換法典(文字) {
  const 狀 = $("法狀態");
  try {
    const 新法 = 翻譯(文字);
    const r = 窮舉檢查(新法);
    if (r.違反.length) throw new 法典錯誤(`窮舉找到 ${r.違反.length} 個違反：${r.違反[0][0]}`);
    法 = 新法;
    狀.className = "法狀態 好";
    狀.textContent = `翻譯成功：${r.工具數} 個檢查工具、${r.規則數} 條規則；窮舉 ${r.組合數} 種組合，違反 0 次。`;
    return true;
  } catch (e) {
    狀.className = "法狀態 壞";
    狀.textContent = "停下來了：" + e.message + "（判定還是用上一份沒問題的法典）";
    return false;
  }
}

function 畫結果() {
  const 章們 = $("章們"), 決 = $("決定");
  if (!上次結果) return;
  const { 結果們, 說明們 } = 上次結果;
  const { 決定, 理由 } = 判定(法, 結果們);
  章們.replaceChildren(...理由.map((r) => {
    const d = document.createElement("div");
    d.className = "章"; 上色(d, r.格);
    const 器 = document.createElement("div"); 器.className = "器"; 器.textContent = r.器;
    const 格 = document.createElement("span"); 格.className = "格"; 格.textContent = r.格;
    const 碼 = document.createElement("div"); 碼.className = "碼"; 碼.textContent = 中文[r.代碼] || r.代碼;
    const em = document.createElement("em"); em.textContent = r.代碼; 碼.append(em);
    const 行 = document.createElement("div"); 行.className = "行";
    行.textContent = r.行 ? `法典第 ${r.行} 行：${r.代碼} → ${r.格}` : `法典沒寫這個代碼，照「讀不到結果」當成「${r.格}」`;
    d.append(格, 器, 碼, 行);
    const 原文 = 說明們[r.器] || "";
    if (原文 && 原文 !== r.代碼) {   // 工具自己的說明是英文，收起來，想看再點開
      const 細 = document.createElement("details"); 細.className = "細";
      const 標 = document.createElement("summary"); 標.textContent = "工具自己的說明（英文原文）";
      const 文 = document.createElement("div"); 文.textContent = 原文;
      細.append(標, 文); d.append(細);
    }
    return d;
  }));
  決.hidden = false; 決.className = "決定"; 上色(決, 決定);
  const 大 = document.createElement("div"); 大.className = "大"; 大.textContent = 決定;
  const 小 = document.createElement("div"); 小.className = "小"; 小.textContent = 決定話[決定] || `照法典合成的結果是「${決定}」。`;
  決.replaceChildren(大, 小);
}

async function 檢查(版本) {
  選中 = 版本.名;
  for (const b of document.querySelectorAll(".版本")) b.setAttribute("aria-checked", String(b.dataset.名 === 選中));
  $("章們").innerHTML = '<p class="提示">兩個工具正在你的瀏覽器裡檢查…</p>';
  $("決定").hidden = true;
  const 基底 = new URL(`examples/${版本.名}/`, location.href);
  const 讀JSON = async (f) => {
    const r = await fetch(new URL(f, 基底), { cache: "no-store" });
    if (!r.ok) throw new Error(`${f} 讀不到（${r.status}）`);
    return r.json();
  };
  const 結果 = await 全部檢查({
    網路網址: new URL(網名, 基底).href, fetchImpl: globalThis.fetch.bind(globalThis), pageOrigin: location.origin,
    讀JSON, 網路檔名: 版本.網路,
  });
  if (選中 !== 版本.名) return;   // 檢查途中又點了別的
  上次結果 = 結果;
  畫結果();
}

async function 開始() {
  原法典 = await (await fetch("core/法典.txt", { cache: "no-store" })).text();
  $("法典").value = 原法典;
  換法典(原法典);
  目錄 = await (await fetch("examples/目錄.json", { cache: "no-store" })).json();
  $("版本們").replaceChildren(...目錄.map((v) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "版本"; b.dataset.名 = v.名;
    b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
    const t = document.createElement("b"); t.textContent = v.中文名;
    const s = document.createElement("small"); s.textContent = v.說明;
    b.append(t, s);
    b.addEventListener("click", () => 檢查(v));
    return b;
  }));
  $("重判").addEventListener("click", () => { if (換法典($("法典").value)) 畫結果(); });
  $("還原").addEventListener("click", () => { $("法典").value = 原法典; 換法典(原法典); 畫結果(); });
}
開始().catch((e) => { $("章們").textContent = "載入失敗：" + e.message; });
