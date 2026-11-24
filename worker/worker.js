// 萬用插座・模型代付服務（Cloudflare Worker＋Durable Object 計數器）
// 讓評審和訪客不用自己的金鑰就能跟助手聊天（官方規格第 4 節「預設推論」、manifest 的 publisher_funded）。
// Publisher-funded default router for the Agentic Trust Hub (spec §4 "Default inference").
//
// 規矩表（先訂規矩，程式照表走；每一條都有測試 tests/代付.mjs）：
//  1. 只收 POST /v1/chat/completions（OpenAI 格式、串流）；GET /v1/models 只列允許的模型。其他一律 404。
//  2. 瀏覽器送來的 Authorization 一律丟掉；只用伺服器祕密 OTARI_KEY。訪客自己的金鑰永遠不會送到這裡（runtime 會改走 byok_router）。
//  3. 只准清單上的網站（ALLOWED_ORIGINS）；只准網路檔寫的模型；請求本體有上限；max_tokens 由這裡定，不信瀏覽器。
//  4. 只替「萬用插座自己的代理網路」付錢：系統提示必須是 trust_hub 的兩個代理之一，工具只能是 trust_hub 的工具，
//     對話則數有上限。拿這裡當免費通用 AI 的請求一律 403。
//  5. 額度用 Durable Object 原子計數（同一個物件裡讀和寫中間沒有空檔，多人同時聊天也不會多放）：
//     每個 IP 每天幾次、全站每天幾次。用完回 429、純文字、中英兩句，聊天視窗會原樣顯示。
//  6. 沒有 OTARI_KEY、或沒綁計數器 LIMITS → 拒絕服務（出事就關門，不會變成「沒有上限」）。
//  7. 每個回應（包括錯誤）都帶 CORS 標頭，聊天視窗才看得到原因。
//  8. 真正的花費上限放在 Otari 帳戶本身（帳戶餘額＝硬上限）。這裡的次數限制是第二道。
//
// 老實話：靜態網頁藏不住任何祕密，所以「瀏覽器拿得到的通行證，腳本也拿得到」。
// 這裡不假裝能分辨人和腳本；擋濫用靠第 4 條（只付本站代理的錢）＋第 5 條（原子額度）＋第 8 條（帳戶餘額）。

export const 規矩 = {
  模型們: ["alibaba/qwen3.8-flash"],
  本體上限: 200_000,          // bytes
  max_tokens: 1024,
  最多訊息: 60,
  每IP每天: 40,
  全站每天: 1500,
  上游: "https://api.otari.ai/api/v1",
  // trust_hub.network.json 裡兩個代理的指令開頭（測試會對照網路檔，改網路檔沒改這裡就會失敗）
  系統提示們: [
    "You are the assistant on the Agentic Trust Hub website.",
    "You help the Agentic Trust Hub assistant audit proposed changes to the hub's law.",
  ],
  工具們: ["website_get_hub_overview", "website_check_demo_site", "website_compare_law_change", "law_auditor", "render_cruse"],
};

const 用完了 = "Today's free allowance on this site is used up. To keep going, add your own key in ⚙ AI model settings. 今天的免費額度用完了，要繼續請在「AI model settings」填你自己的金鑰。";
const 太多了 = "You have used this site's free allowance for today. To keep going, add your own key in ⚙ AI model settings. 你今天的免費次數用完了，要繼續請在「AI model settings」填你自己的金鑰。";
const 不是本站 = "This free model only answers the Agentic Trust Hub's own assistant. 這個免費模型只替萬用插座自己的助手回答。";

function 允許來源們(env) {
  return String(env.ALLOWED_ORIGINS ?? "https://2738777-ai.github.io").split(",").map((s) => s.trim()).filter(Boolean);
}
function CORS(來源, env) {
  const 可 = 來源 && 允許來源們(env).includes(來源);
  return {
    "Access-Control-Allow-Origin": 可 ? 來源 : 允許來源們(env)[0],
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
const 文字回應 = (狀態, 字, 標頭) => new Response(字, { status: 狀態, headers: { ...標頭, "Content-Type": "text/plain; charset=utf-8" } });

// 規矩 4：是不是萬用插座自己的代理在問
export function 是本站代理(本體) {
  const 訊息 = 本體.messages;
  if (!Array.isArray(訊息) || 訊息.length === 0 || 訊息.length > 規矩.最多訊息) return false;
  const 系統 = 訊息[0];
  if (系統?.role !== "system" || typeof 系統.content !== "string") return false;
  if (!規矩.系統提示們.some((p) => 系統.content.includes(p))) return false;
  if (訊息.slice(1).some((m) => m?.role === "system")) return false;           // 不准在中間塞第二個系統提示
  const 工具 = 本體.tools ?? [];
  if (!Array.isArray(工具)) return false;
  return 工具.every((t) => t?.type === "function" && 規矩.工具們.includes(t.function?.name));
}

// ---------- 規矩 5：原子計數（純邏輯；Durable Object 和測試共用） ----------
// 存：{ 讀(鍵) → 數字, 寫(鍵, 數字) }，必須同步（中間不能 await），原子性就靠這一點。
export function 記一次(存, 日, ip, 上限) {
  const 全 = `all:${日}`, 人 = `ip:${ip}:${日}`;
  const a = 存.讀(全), b = 存.讀(人);
  if (a >= 上限.全站) return "全站";
  if (b >= 上限.每IP) return "每IP";
  存.寫(全, a + 1); 存.寫(人, b + 1);
  return null;
}

// Durable Object：全站只有一個（名字 "global"），所有計數都在它裡面排隊，一次處理一個。
export class HubLimits {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS 計數 (鍵 TEXT PRIMARY KEY, 數 INTEGER NOT NULL, 日 TEXT NOT NULL)");
  }
  async fetch(請求) {
    const { 日, ip, 全站, 每IP } = await 請求.json();
    this.sql.exec("DELETE FROM 計數 WHERE 日 <> ?", 日);   // 舊的日子清掉，表不會長大
    const 存 = {
      讀: (k) => this.sql.exec("SELECT 數 FROM 計數 WHERE 鍵 = ?", k).toArray()[0]?.數 ?? 0,
      寫: (k, n) => this.sql.exec("INSERT INTO 計數 (鍵, 數, 日) VALUES (?, ?, ?) ON CONFLICT(鍵) DO UPDATE SET 數 = excluded.數", k, n, 日),
    };
    return Response.json({ 超過: 記一次(存, 日, ip, { 全站, 每IP }) });
  }
}

export default {
  async fetch(請求, env, _ctx, 對外fetch = fetch) {
    const 網址 = new URL(請求.url);
    const 來源 = 請求.headers.get("Origin");
    const 標頭 = CORS(來源, env);
    const 路 = 網址.pathname.replace(/\/+$/, "");

    if (請求.method === "OPTIONS") return new Response(null, { status: 204, headers: 標頭 });
    if (!來源 || !允許來源們(env).includes(來源)) return 文字回應(403, "This model router only serves the Agentic Trust Hub site.", 標頭);

    if (請求.method === "GET" && 路 === "/v1/models") {
      return new Response(JSON.stringify({ object: "list", data: 規矩.模型們.map((id) => ({ id, object: "model" })) }), { headers: { ...標頭, "Content-Type": "application/json" } });
    }
    if (請求.method !== "POST" || 路 !== "/v1/chat/completions") return 文字回應(404, "Not found.", 標頭);

    if (!env.OTARI_KEY || !env.LIMITS) return 文字回應(503, "The free model is not set up on this site yet. Add your own key in ⚙ AI model settings. 本站的免費模型還沒設定好，請先填你自己的金鑰。", 標頭);

    const 原文 = await 請求.text();
    if (new TextEncoder().encode(原文).length > 規矩.本體上限) return 文字回應(413, "This request is too large for the free model.", 標頭);
    let 本體;
    try { 本體 = JSON.parse(原文); } catch { return 文字回應(400, "Bad request.", 標頭); }
    if (!本體 || typeof 本體 !== "object" || !Array.isArray(本體.messages)) return 文字回應(400, "Bad request.", 標頭);
    if (!規矩.模型們.includes(本體.model)) return 文字回應(400, `The free model on this site is ${規矩.模型們.join(", ")}. For other models, add your own key in ⚙ AI model settings.`, 標頭);
    if (!是本站代理(本體)) return 文字回應(403, 不是本站, 標頭);

    // 原子計數：交給唯一的 Durable Object；它出錯就關門
    let 超過;
    try {
      const 物件 = env.LIMITS.get(env.LIMITS.idFromName("global"));
      const r = await 物件.fetch("https://limits/count", {
        method: "POST",
        body: JSON.stringify({
          日: new Date().toISOString().slice(0, 10),
          ip: 請求.headers.get("CF-Connecting-IP") ?? "unknown",
          全站: Number(env.DAILY_CAP ?? 規矩.全站每天),
          每IP: Number(env.PER_IP_DAILY ?? 規矩.每IP每天),
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      ({ 超過 } = await r.json());
    } catch {
      return 文字回應(503, "The free model's allowance counter is not available. Try again, or add your own key in ⚙ AI model settings.", 標頭);
    }
    if (超過 === "全站") return 文字回應(429, 用完了, 標頭);
    if (超過 === "每IP") return 文字回應(429, 太多了, 標頭);

    // 只轉送允許的欄位；max_tokens 和 stream 由這裡定
    const 轉送 = { model: 本體.model, messages: 本體.messages, stream: true, max_tokens: 規矩.max_tokens };
    if (Array.isArray(本體.tools) && 本體.tools.length) { 轉送.tools = 本體.tools; 轉送.tool_choice = "auto"; }

    let 上游回應;
    try {
      上游回應 = await 對外fetch(`${env.UPSTREAM ?? 規矩.上游}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OTARI_KEY}` },
        body: JSON.stringify(轉送),
      });
    } catch {
      return 文字回應(502, "The free model could not be reached. Try again, or add your own key in ⚙ AI model settings.", 標頭);
    }
    if (!上游回應.ok) {
      // 上游的錯誤內容可能帶帳戶資訊：不轉給瀏覽器，只給狀態
      const 沒錢 = 上游回應.status === 402 || 上游回應.status === 429;
      return 文字回應(沒錢 ? 429 : 502, 沒錢 ? 用完了 : `The free model answered with an error (${上游回應.status}). Try again, or add your own key in ⚙ AI model settings.`, 標頭);
    }
    return new Response(上游回應.body, { status: 200, headers: { ...標頭, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" } });
  },
};
