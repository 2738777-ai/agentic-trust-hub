// 命令列和測試共用：把一個資料夾當成網站來讀（只准讀資料夾裡面的檔案）。
import { readFile } from "node:fs/promises";
import path from "node:path";

export const 假網址 = "https://inspect.local";

export function 資料夾fetch(資料夾) {
  return async (目標) => {
    const u = new URL(typeof 目標 === "string" ? 目標 : 目標.url);
    if (u.origin !== 假網址) return new Response("", { status: 404 });
    const 檔 = path.resolve(資料夾, "." + decodeURIComponent(u.pathname));
    if (!檔.startsWith(path.resolve(資料夾) + path.sep)) return new Response("", { status: 403 });
    try {
      const 內容 = await readFile(檔);
      return new Response(內容, { status: 200, headers: { "content-type": 檔.endsWith(".json") ? "application/json" : "text/plain" } });
    } catch { return new Response("", { status: 404 }); }
  };
}

// 讀一個檔，沒有就回 null
export const 讀或空 = (資料夾) => async (f) => { try { return await readFile(path.join(資料夾, f), "utf8"); } catch { return null; } };

// 替一個版本資料夾準備 做紀錄 要的東西（基準＝同一層的 A_normal）
export function 紀錄材料(資料夾, 網名 = "tidewhistle_guesthouse") {
  const 網路檔名 = `${網名}.network.json`;
  return {
    版本名: path.basename(資料夾), 網路檔名,
    讀: 讀或空(資料夾), 讀基準: 讀或空(path.join(path.dirname(資料夾), "A_normal")),
    工具環境: {
      網路網址: `${假網址}/${網名}`, fetchImpl: 資料夾fetch(資料夾), pageOrigin: "https://hub.local",
      讀JSON: async (f) => JSON.parse(await readFile(path.join(資料夾, f), "utf8")), 網路檔名,
    },
  };
}
