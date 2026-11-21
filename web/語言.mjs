// 中英切換：網址 ?lang=en / ?lang=zh 最優先，再來是上次選的，最後看瀏覽器語言。
// 這個檔很小，頁面一打開就先載入，所以文字不會等檢查工具下載完才出現。
function 決定語言() {
  const 指定 = new URLSearchParams(location.search).get("lang");
  if (指定 === "en" || 指定 === "zh") { try { localStorage.setItem("lang", 指定); } catch { /* 無痕模式 */ } return 指定; }
  try { const 上次 = localStorage.getItem("lang"); if (上次 === "en" || 上次 === "zh") return 上次; } catch { /* 無痕模式 */ }
  return /^zh/i.test(navigator.language || "") ? "zh" : "en";
}

export const 語 = 決定語言();
export const 是英文 = 語 === "en";
export const 選 = (中, 英) => (是英文 ? 英 : 中);

// 字典：{ 鍵: [中文, 英文] }。頁面上有 data-字="鍵" 的地方換成對應語言（字典是自己寫的，不是外來資料）。
export function 套用(字典) {
  document.documentElement.lang = 是英文 ? "en" : "zh-Hant";
  if (字典.$標題) document.title = 選(...字典.$標題);
  for (const e of document.querySelectorAll("[data-字]")) {
    const v = 字典[e.dataset.字];
    const 字 = v && 選(...v);
    if (字 != null) e.innerHTML = 字;   // 沒寫的語言就留原文
  }
  for (const e of document.querySelectorAll("[data-標籤]")) {
    const v = 字典[e.dataset.標籤];
    if (v) e.setAttribute("aria-label", 選(...v));
  }
  const 鈕 = document.getElementById("換語言");
  if (鈕) {
    鈕.textContent = 是英文 ? "中文" : "English";
    鈕.setAttribute("lang", 是英文 ? "zh-Hant" : "en");
    鈕.addEventListener("click", () => {
      const u = new URL(location.href);
      u.searchParams.set("lang", 是英文 ? "zh" : "en");
      location.href = u.href;
    });
  }
}

// 檢查工具（約 100 KB）在背景下載；下載完之前畫面先能看、能點。
let 核心承諾 = null;
export function 載入核心() {
  核心承諾 ??= import("./核心包.js");
  return 核心承諾;
}
