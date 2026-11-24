import fs from "node:fs";
const 單們 = JSON.parse(fs.readFileSync(new URL("./修補單們.json", import.meta.url), "utf8"));
const 手法數 = {}, 剪數 = {}, 邊 = {};
let 總 = 0;
for (const 單 of 單們) {
  總 += 單.走得通的招數;
  const 剪們 = 單.門口剪斷處.map((c) => `${c.器}「${c.代碼}」｜法典第 ${c.法典行} 行`);
  for (const 法 of 單.手法) { 手法數[法] = (手法數[法] ?? 0) + 單.走得通的招數; for (const 剪 of 剪們) 邊[法 + "→" + 剪] = (邊[法 + "→" + 剪] ?? 0) + 單.走得通的招數; }
  for (const 剪 of 剪們) 剪數[剪] = (剪數[剪] ?? 0) + 單.走得通的招數;
}
const 左 = Object.entries(手法數).sort((a, b) => b[1] - a[1]), 中 = Object.entries(剪數).sort((a, b) => b[1] - a[1]);
const W = 1000, 左x = 150, 中x = 520, 右x = 860;
const 左y = (i) => 70 + i * (480 / (左.length - 1)), 中y = (i) => 140 + i * (340 / Math.max(1, 中.length - 1)), 右y = 310;
const 最大 = Math.max(...Object.values(邊));
let svg = "";
for (const [k, n] of Object.entries(邊)) {
  const [a, b] = k.split("→"); const i = 左.findIndex((x) => x[0] === a), j = 中.findIndex((x) => x[0] === b);
  svg += `<path d="M${左x + 70} ${左y(i)} C ${左x + 230} ${左y(i)}, ${中x - 200} ${中y(j)}, ${中x - 95} ${中y(j)}" stroke="#f85149" stroke-opacity="${0.25 + 0.6 * n / 最大}" stroke-width="${1 + 9 * n / 最大}" fill="none"/>`;
}
中.forEach(([k, n], j) => { svg += `<path d="M${中x + 95} ${中y(j)} C ${中x + 200} ${中y(j)}, ${右x - 200} ${右y}, ${右x - 70} ${右y}" stroke="#58a6ff" stroke-opacity=".35" stroke-width="${1 + 9 * n / 總}" stroke-dasharray="6 6" fill="none"/>`; });
左.forEach(([k, n], i) => { svg += `<circle cx="${左x}" cy="${左y(i)}" r="${16 + 22 * Math.sqrt(n / 總)}" fill="#1b2633" stroke="#f85149" stroke-width="2"/><text x="${左x}" y="${左y(i) - 4}" text-anchor="middle" font-size="15" fill="#fff">${k}</text><text x="${左x}" y="${左y(i) + 16}" text-anchor="middle" font-size="13" fill="#f0a39d">${n} 招</text>`; });
中.forEach(([k, n], j) => { const [上, 下] = k.split("｜"); svg += `<rect x="${中x - 95}" y="${中y(j) - 34}" width="190" height="68" rx="12" fill="#2a2006" stroke="#e3b341" stroke-width="2"/><text x="${中x}" y="${中y(j) - 8}" text-anchor="middle" font-size="15" fill="#e3b341">✂ ${上}</text><text x="${中x}" y="${中y(j) + 14}" text-anchor="middle" font-size="13" fill="#cdb88a">${下}・剪斷 ${n} 招</text>`; });
svg += `<circle cx="${右x}" cy="${右y}" r="70" fill="#2b1214" stroke="#f85149" stroke-width="3"/><text x="${右x}" y="${右y - 18}" text-anchor="middle" font-size="16" fill="#fff">★ 出事的那一行</text><text x="${右x}" y="${右y + 6}" text-anchor="middle" font-size="13" fill="#f0a39d">${單們[0].出事的那一行}</text><text x="${右x}" y="${右y + 30}" text-anchor="middle" font-size="15" fill="#fff">${總} 招全匯到這</text>`;
const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><style>body{margin:0;background:#0b1015;color:#e2eaf1;font:16px/1.5 "Noto Sans CJK TC",sans-serif}.頁{width:${W}px;padding:28px 34px}.小{color:#8796a5;font-size:14px}h1{margin:4px 0;font-size:27px}svg text{font-family:"Noto Sans CJK TC",sans-serif}
.漏斗{display:flex;gap:10px;align-items:center;margin:10px 0 0;font-size:15px}.漏斗 b{font-size:22px}.箭{color:#8796a5}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:8px}td,th{border-bottom:1px dashed #23303d;padding:6px 6px;text-align:left;vertical-align:top}th{color:#8796a5;font-weight:400}.綠{color:#3fb950;font-weight:800}.拒{color:#f85149;font-weight:800}.待{color:#f0883e;font-weight:800}h2{font-size:19px;margin:22px 0 4px}</style>
<div class="頁"><div class="小">萬用插座・修補單（給資安人員或他的修補代理）</div><h1>3000 招，全部匯到同一行程式</h1>
<div class="漏斗"><span>駭客打了 <b>3006</b> 招</span><span class="箭">→</span><span>沒插座會得手 <b class="拒">${總}</b> 招</span><span class="箭">→</span><span><b>${單們.length}</b> 種走法</span><span class="箭">→</span><span>★ <b class="拒">1</b> 行程式</span><span class="箭">→</span><span>修這一行，全部解決</span></div>
<svg viewBox="0 0 ${W} 560" width="${W - 40}" height="560">${svg}
<text x="${左x}" y="22" text-anchor="middle" font-size="14" fill="#8796a5">駭客的手法（一招可能混好幾種）</text><text x="${中x}" y="22" text-anchor="middle" font-size="14" fill="#8796a5">插座在門口剪斷的地方</text><text x="${右x}" y="22" text-anchor="middle" font-size="14" fill="#8796a5">沒插座時會走到哪</text></svg>
<h2>修補代理照單修好後，驗收法典把關（拿掉門口插座，直接打修好的程式）</h2>
<table><tr><th>誰交的修補</th><th>重播 594 招</th><th>誘餌</th><th>正常檔</th><th>判決・哪一條擋的</th></tr>
<tr><td>老實的修補代理（例子裡的字只當資料）</td><td>漏 0</td><td>碰不到</td><td>全過</td><td class="綠">綠：可以上線</td></tr>
<tr><td>照「例子」裡駭客那句話做的修補代理</td><td>刪成 551 招，漏 0</td><td class="拒">碰得到</td><td>全擋</td><td class="拒">拒：誘餌碰得到（第 14 行）、測試變少（第 22 行）</td></tr>
<tr><td>下毒一：公開資料夾改成整台機器</td><td>漏 0</td><td class="拒">碰得到</td><td>全擋</td><td class="拒">拒：誘餌碰得到（第 14 行）</td></tr>
<tr><td>下毒二：偷懶修法，沒追捷徑</td><td class="拒">漏 43</td><td class="拒">碰得到</td><td>全過</td><td class="拒">拒：重播有漏（第 10 行）</td></tr>
<tr><td>下毒三：偷懶修法＋刪掉捷徑測試</td><td>刪成 551 招，漏 0</td><td class="拒">碰得到</td><td>全過</td><td class="拒">拒：只靠「誘餌」和「測試不准變少」兩條抓到</td></tr>
<tr><td>下毒四：順手放寬門口法典</td><td>漏 0</td><td>碰不到</td><td>全過</td><td class="待">待審：比鬆緊抓到放鬆（第 27 行），要人點頭</td></tr></table>
<div class="小" style="margin-top:12px">下毒三最陰險：攻擊重播看起來全擋。如果驗收只看「重播有沒有漏」，它就會上線。所以驗收法典另外放了誘餌（直接算出走到假密碼的路）和「測試不准變少」。<br>老實說：沙盒本機模擬；駭客、守衛、修補代理都是模擬程式；修補代理的修法是這一類漏洞的標準修法，不是它自己想出來的。驗收五份修補共 0.5 秒。</div></div></html>`;
fs.writeFileSync(new URL("./路線圖.html", import.meta.url), html);
