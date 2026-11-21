// 萬用插座核心：白話法典 → 表 → 判定。瀏覽器和命令列共用同一份，不依賴任何外部套件。
// 規矩：看不懂就停、前後矛盾就停、對到尺上沒有的格就停、「讀不到結果」必須是最嚴的那格。
// 中文、英文兩種寫法都認得；英文的格名和工具名先換成標準名字（中文），引擎只認標準名字。

export class 法典錯誤 extends Error {
  constructor(中, 英) { super(中); this.英文 = 英 ?? 中; }
}

export const 英文對照 = {
  格: { GREEN: "綠", YELLOW: "黃", REVIEW: "待審", DENY: "拒" },
  器: { "Agent Customs": "進門檢查（Agent Customs）", NandaSeal: "真偽檢查（NandaSeal）" },
  合成: { "worst wins": "最壞的贏" },
};
const 反查 = (表, 值) => Object.keys(表).find((k) => 表[k] === 值);
// 顯示用：標準名字換回英文（沒有對照的就照原樣）
export const 英文格 = (格) => 反查(英文對照.格, 格) ?? 格;
export const 英文器 = (器) => 反查(英文對照.器, 器) ?? 器;
const 標準格 = (x) => 英文對照.格[x.toUpperCase()] ?? x;
const 標準器 = (x) => 英文對照.器[x] ?? x;

export function 翻譯(文字) {
  let 尺 = null, 合成 = null, 讀不到 = null;
  const 轉接 = {}, 來源行 = {};
  文字.split(/\r?\n/).forEach((原行, i) => {
    const 行 = 原行.split("#")[0].trim();
    if (!行) return;
    let m;
    if ((m = 行.match(/^(?:尺：|scale:)\s*(.+)$/i))) { 尺 = m[1].split("<").map((s) => 標準格(s.trim())).filter(Boolean); return; }
    if ((m = 行.match(/^(?:合成：|combine:)\s*(.+)$/i))) { 合成 = 英文對照.合成[m[1].trim().toLowerCase()] ?? m[1].trim(); return; }
    if ((m = 行.match(/^(?:讀不到結果：|unreadable:)\s*(.+)$/i))) { 讀不到 = 標準格(m[1].trim()); return; }
    if ((m = 行.match(/^(.+?)說\s+(\S+)\s*→\s*(\S+)$/) || 行.match(/^(.+?)\s+says\s+(\S+)\s*(?:→|->)\s*(\S+)$/i))) {
      const 器 = 標準器(m[1].trim()), 表 = (轉接[器] ??= {}), 格 = 標準格(m[3]);
      if (m[2] in 表) throw new 法典錯誤(`第 ${i + 1} 行和前面矛盾或重複：${器} 的 ${m[2]} 已經寫成「${表[m[2]]}」`,
        `Line ${i + 1} repeats or contradicts an earlier line: ${英文器(器)} ${m[2]} is already ${英文格(表[m[2]])}`);
      表[m[2]] = 格; 來源行[`${器}|${m[2]}`] = i + 1; return;
    }
    throw new 法典錯誤(`第 ${i + 1} 行看不懂：${行}`, `Line ${i + 1} is not understood: ${行}`);
  });
  const 錯 = [];
  if (!尺 || 尺.length < 2) 錯.push(["少了「尺：…」那一行（至少兩格）", "Missing the \"scale:\" line (needs at least two levels)"]);
  if (合成 !== "最壞的贏") 錯.push(["「合成」目前只認得「最壞的贏」", "\"combine:\" only knows \"worst wins\""]);
  if (!尺?.includes(讀不到)) 錯.push(["少了「讀不到結果：…」，或它不在尺上", "Missing \"unreadable:\", or it is not on the scale"]);
  else if (讀不到 !== 尺.at(-1)) 錯.push(["「讀不到結果」必須是尺上最嚴的那一格（出事就關門）", "\"unreadable:\" must be the strictest level (fail closed)"]);
  if (!Object.keys(轉接).length) 錯.push(["一個檢查工具都沒有接", "No checker is plugged in"]);
  for (const [器, 表] of Object.entries(轉接))
    for (const [代碼, 格] of Object.entries(表))
      if (!尺?.includes(格)) { const n = 來源行[`${器}|${代碼}`];
        錯.push([`第 ${n} 行：${器} 的 ${代碼} 對到「${格}」，尺上沒有這一格`, `Line ${n}: ${英文器(器)} ${代碼} maps to "${英文格(格)}", which is not on the scale`]); }
  if (錯.length) throw new 法典錯誤(錯.map((e) => e[0]).join("；"), 錯.map((e) => e[1]).join("; "));
  return { 尺, 讀不到, 轉接, 來源行 };
}

// 合成：每個工具的代碼換到尺上的格，最壞的那一格贏；查不到的代碼一律當「讀不到結果」。
export function 判定(法, 結果們) {
  const 理由 = Object.entries(結果們).map(([器, 代碼]) => {
    const 格 = 法.轉接[器]?.[代碼];
    return { 器, 代碼, 格: 格 ?? 法.讀不到, 行: 格 ? 法.來源行[`${器}|${代碼}`] : null };
  });
  if (!理由.length) return { 決定: 法.讀不到, 理由 };
  const 決定 = 法.尺[Math.max(...理由.map((r) => 法.尺.indexOf(r.格)))];
  return { 決定, 理由 };
}

// 窮舉：每個工具的每一種代碼（再加一個沒見過的怪代碼）全部組合跑一遍，檢查三句話永遠成立。
export function 窮舉檢查(法) {
  const 器們 = Object.keys(法.轉接);
  const 選項 = 器們.map((器) => [...Object.keys(法.轉接[器]), "沒見過的代碼"]);
  const 最嚴 = 法.尺.at(-1);
  let 組合數 = 0;
  const 違反 = [];
  const 走 = (i, 組) => {
    if (i === 器們.length) {
      組合數++;
      const { 決定 } = 判定(法, 組);
      const 各格 = 器們.map((器) => 法.轉接[器][組[器]] ?? 法.讀不到);
      const 最壞 = 法.尺[Math.max(...各格.map((g) => 法.尺.indexOf(g)))];
      if (決定 !== 最壞) 違反.push(["決定不是最壞的那一格", 組]);
      if (各格.includes(最嚴) && 決定 !== 最嚴) 違反.push(["有人說最嚴，結果卻被放寬", 組]);
      if (Object.values(組).includes("沒見過的代碼") && 決定 !== 最嚴) 違反.push(["沒見過的代碼沒有被當成最嚴", 組]);
      return;
    }
    for (const 碼 of 選項[i]) 走(i + 1, { ...組, [器們[i]]: 碼 });
  };
  走(0, {});
  return { 工具數: 器們.length, 規則數: Object.values(法.轉接).reduce((n, t) => n + Object.keys(t).length, 0), 組合數, 違反 };
}
