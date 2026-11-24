// 萬用插座・模型代付服務（Cloudflare Worker）
// 讓評審和訪客不用自己的金鑰就能跟助手聊天（官方規格第 4 節「預設推論」、manifest 的 publisher_funded）。
// Publisher-funded default router for the Agentic Trust Hub (spec §4 "Default inference").
//
// 規矩表（先訂規矩，程式照表走；每一條都有測試 worker/測試.mjs）：
//  1. 只收 POST /v1/chat/completions（OpenAI 格式、串流）；GET /v1/models 只列允許的模型。其他一律 404。
//  2. 瀏覽器送來的 Authorization 一律丟掉；只用伺服器祕密 OTARI_KEY。訪客自己的金鑰永遠不會送到這裡（runtime 會改走 byok_router）。
//  3. 只准清單上的網站（ALLOWED_ORIGINS）；只准網路檔寫的模型；請求本體有上限；max_tokens 由這裡定，不信瀏覽器。
//  4. 額度：每個 IP 每天幾次、全站每天幾次（要綁 KV 名字 LIMITS）。用完回 429、純文字、中英兩句，聊天視窗會原樣顯示。
//  5. 沒有 OTARI_KEY、或沒綁 KV → 拒絕服務（出事就關門，不會變成「沒有上限」）。
//  6. 每個回應（包括錯誤）都帶 CORS 標頭，聊天視窗才看得到原因。
//  7. 真正的花費上限放在 Otari 帳戶本身（帳戶餘額＝硬上限）。這裡的次數限制是第二道。

export const 規矩 = {
  模型們: ["alibaba/qwen3.8-flash"],
  本體上限: 200_000,          // bytes
  max_tokens: 1024,
  每IP每天: 40,
  全站每天: 1500,
  上游: "https://api.otari.ai/api/v1",
};

const 用完了 = "Today's free allowance on this site is used up. To keep going, add your own key in ⚙ AI model settings. 今天的免費額度用完了，要繼續請在「AI model settings」填你自己的金鑰。";
const 太多了 = "You have used this site's free allowance for today. To keep going, add your own key in ⚙ AI model settings. 你今天的免費次數用完了，要繼續請在「AI model settings」填你自己的金鑰。";

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

async function 記一次(env, 鍵, 上限) {
  const 現在 = Number((await env.LIMITS.get(鍵)) ?? 0);
  if (現在 >= 上限) return false;
  await env.LIMITS.put(鍵, String(現在 + 1), { expirationTtl: 60 * 60 * 26 });
  return true;
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

    const 日 = new Date().toISOString().slice(0, 10);
    const ip = 請求.headers.get("CF-Connecting-IP") ?? "unknown";
    if (!(await 記一次(env, `all:${日}`, Number(env.DAILY_CAP ?? 規矩.全站每天)))) return 文字回應(429, 用完了, 標頭);
    if (!(await 記一次(env, `ip:${ip}:${日}`, Number(env.PER_IP_DAILY ?? 規矩.每IP每天)))) return 文字回應(429, 太多了, 標頭);

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
      return 文字回應(上游回應.status === 402 || 上游回應.status === 429 ? 429 : 502,
        上游回應.status === 402 || 上游回應.status === 429 ? 用完了 : `The free model answered with an error (${上游回應.status}). Try again, or add your own key in ⚙ AI model settings.`, 標頭);
    }
    return new Response(上游回應.body, { status: 200, headers: { ...標頭, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" } });
  },
};
