// 打包入口：別的代理網站一行就能裝上萬用插座閘門。產出 gate/trust-hub-gate.js（node tools/打包閘門.mjs）。
// 規則見 gate/README.md（和 trust-gate.js 開頭的規矩 1～9 同一份）。對外的介面用英文，給其他網站的開發者。
import { 安裝閘門, 卡片答案 } from "../trust-gate.js";
import * as 翻譯器 from "../core/翻譯器.mjs";
import * as 工具 from "../core/工具.mjs";

// 只帶閘門要用的兩塊核心（檢查工具＋法典翻譯判定），不帶畫面用的部分
const 核 = { ...翻譯器, ...工具 };
import 預設法典 from "../core/法典.en.txt";

export const VERSION = "1.0.0";
export const DEFAULT_LAW = 預設法典;

const 英文格 = { 綠: "GREEN", 黃: "YELLOW", 待審: "REVIEW", 拒: "DENY" };
const 英文原因 = { 法典: "law", 掉包: "bait-and-switch", 讀不到: "unreadable" };

/** 規矩 8：認得的官方執行程式才裝；不認得就關掉別站呼叫 */
function 檢查引擎(engine) {
  const 缺 = [];
  if (typeof engine?.resolveRemote !== "function") 缺.push("resolveRemote");
  if (typeof engine?._assertAllowedPeer !== "function") 缺.push("_assertAllowedPeer");
  if (typeof engine?.registry?.cacheKey !== "function") 缺.push("registry.cacheKey");
  if (typeof engine?.registry?.checkCycle !== "function") 缺.push("registry.checkCycle");
  if (!(engine?.registry?.cache instanceof Map)) 缺.push("registry.cache");
  if (!engine || !("top" in engine)) 缺.push("top");
  return 缺;
}

/** 把閘門的內部回報換成給別人用的英文物件 */
function 英文回報(r) {
  const 查 = r.查;
  const 來源 = 查?.來源 ?? r.來源;
  return {
    partner: 查?.網路名 ?? r.網路名,
    host: (() => { try { return new URL(來源).host; } catch { return String(來源 ?? ""); } })(),
    allowed: !r.擋下,
    decision: 查 ? 英文格[查.決定] ?? "DENY" : "DENY",
    reason: r.擋下 ? 英文原因[r.原因] ?? "unreadable" : null,
    reasons: (查?.理由 ?? []).map((x) => ({ checker: 核.英文器(x.器), code: x.代碼, level: 核.英文格(x.格), lawLine: x.行 ?? null })),
    ...(r.私有資料 ? { privateContextSent: r.私有資料.送出 } : {}),
    ...(r.錯 ? { error: r.錯 } : {}),
  };
}

function 寫狀態(元素, x) {
  if (!元素) return;
  const 私 = x.privateContextSent ? ` Private context sent: ${x.privateContextSent.join(", ") || "none"}; everything else stays here.` : "";
  元素.textContent = x.allowed
    ? `Trust hub: partner ${x.partner} at ${x.host} is ${x.decision}; allowed to run.${私}`
    : x.reason === "bait-and-switch"
      ? `Trust hub blocked ${x.partner} at ${x.host}: the files it would run are not the files it checked.`
      : x.reason === "unreadable"
        ? `Trust hub could not check ${x.partner} at ${x.host}, so it was blocked.`
        : `Trust hub blocked ${x.partner} at ${x.host} (${x.decision}); none of its agents ran.`;
}

/**
 * Install the Trust Hub gate on an official agentic-web runtime engine.
 * Fails closed: if anything here throws, partner calls are switched off and the error is rethrown.
 */
export function install(engine, { law = 預設法典, privateContext = {}, statusElement = null, onReport = null } = {}) {
  try {
    const 缺 = 檢查引擎(engine);
    if (缺.length) throw new Error(`Trust Hub gate does not recognise this runtime (missing: ${缺.join(", ")}).`);
    核.翻譯(law);                                   // 法典讀不懂就不裝（翻譯器會丟錯）
    // 規矩 1：不管 onConsent 是現在設、還是之後才設，答案都先過「只准三種」
    let 卡片 = engine.onConsent;
    Object.defineProperty(engine, "onConsent", {
      configurable: true, enumerable: true,
      get: () => (typeof 卡片 === "function" ? async (info) => 卡片答案(await 卡片(info)) : 卡片),
      set: (v) => { 卡片 = v; },
    });
    安裝閘門(engine, {
      載入核心: async () => 核,
      讀法典: async () => law,
      pageOrigin: typeof location !== "undefined" ? location.origin : undefined,
      私有資料白名單: privateContext,
      回報: (r) => { const x = 英文回報(r); 寫狀態(statusElement, x); onReport?.(x); },
    });
    return { version: VERSION };
  } catch (e) {
    if (engine && typeof engine === "object") {
      engine.resolveRemote = async () => { throw new Error(`Trust Hub gate is not active, so partner sites are off: ${e?.message || e}`); };
    }
    throw e;
  }
}
