// 萬用插座・跨站閘門（T4）：別站的代理要進來之前，先過插座這一關。
// Trust gate for partner networks: the hub checks the exact partner network the runtime will run.
//
// 照 experiments/跨站同意/狀態機.mjs 窮舉證明過的「綁定」裝法（240 條路徑、四條規矩 0 違反）：
//   規矩 1  同意卡片只准三種答案：allow／always／decline。其他值（空的、拼錯）一律當 decline。
//           （官方 requestConsent 把沒回答當允許，這裡補上）
//   規矩 2  插座裝在「抓別站網路」那一步（包住 engine.resolveRemote），不裝在卡片裡：
//           卡片按過「永遠允許」後不再跳出，但每一次抓網路都一定經過這裡。
//   規矩 3  使用者同意之後才聯絡別站（官方先問卡片、才呼叫 resolveRemote）；
//           聯絡之前先過官方的 allowed_peers 和循環檢查，不准的來源連碰都不碰。
//   規矩 4  每個網址只抓一次、存成快照；兩個檢查工具看的是同一份快照（別站不能給兩個工具看不同的東西）。
//   規矩 5  判定只看法典：綠、黃放行；待審、拒、讀不到一律擋下，別站的代理一個都不跑。
//   規矩 6  比指紋：插座檢查的快照，必須和執行程式真的要跑的那一份一字不差（描述檔＋網路，不含 links），
//           不一樣就擋下（防「先給檢查的人看好的，執行時換壞的」）。
//   規矩 7  擋下的網路不留在快取；只有放行過、指紋相同的才准從快取再用。
//   規矩 8  閘門自己出錯＝讀不到＝擋下。
//   規矩 9  私有資料按目的地點名（T6，規格「Destination-scoped private-context policies」）：
//           官方只照「我方代理」的 allow.to_downstream 篩一次，同一張清單對所有別站都一樣；
//           插座再按「目的地網路」點名一次，兩張清單都有的欄位才送出，其他一律拿掉。
//
// 這裡不寫任何判定規則：判定交給 web/核心包.js 和 core/法典.en.txt（和試打台、命令列同一份）。
import { parseHocon } from "./runtime/hocon.js";
import { filterConfig } from "./runtime/kernel.js";
import { resolveUrl } from "./runtime/remote.js";

const 核心網址 = new URL("./web/核心包.js", import.meta.url).href;
const 放行 = new Set(["綠", "黃"]);

/** 規矩 1：卡片只准三種答案 */
export const 卡片答案 = (d) => (d === "allow" || d === "always" || d === "decline" ? d : "decline");

/** 鍵排好序的 JSON，用來算指紋（同樣的內容不管鍵的順序都一樣） */
function 排好(x) {
  if (Array.isArray(x)) return x.map(排好);
  if (x && typeof x === "object") return Object.fromEntries(Object.keys(x).sort().map((k) => [k, 排好(x[k])]));
  return x;
}
/** 規矩 6：指紋＝描述檔＋（經官方 filterConfig 的）網路，不含 links */
export function 指紋(manifest, networkConfig) {
  const 網 = { ...networkConfig }; delete 網.links;
  return JSON.stringify(排好({ manifest, network: 網 }));
}

/** 規矩 4：每個網址只抓一次的 fetch（快照） */
function 快照fetch(底fetch) {
  const 表 = new Map();
  const f = async (網址, 選項) => {
    const 鍵 = new URL(String(網址)).href;
    if (!表.has(鍵)) {
      表.set(鍵, (async () => {
        const r = await 底fetch(鍵, { ...(選項 || {}), cache: "no-store" });
        return { 狀態: r.status, 字: await r.text(), 型: r.headers.get("content-type") || "" };
      })());
    }
    const s = await 表.get(鍵);
    return new Response(s.字, { status: s.狀態, headers: { "content-type": s.型 } });
  };
  f.讀 = async (網址) => { const r = await f(網址); if (!r.ok) throw new Error(`${網址} (${r.status})`); return r.text(); };
  return f;
}

/**
 * 檢查一個夥伴網路：抓快照、跑兩個檢查工具、照法典判定、算指紋。
 * :return: { 放行, 決定, 理由, 說明們, 指紋, 網路名, 來源 }
 */
export async function 檢查夥伴(origin, 網路名, { 核, 法典文字, 底fetch = globalThis.fetch.bind(globalThis), pageOrigin }) {
  const 抓 = 快照fetch(底fetch);
  const base = origin.replace(/\/$/, "");
  const 描述字 = await 抓.讀(`${base}/agent-manifest.json`);
  const manifest = JSON.parse(描述字);
  const entry = (manifest.networks || []).find((n) => n.name === 網路名);
  if (!entry) throw new Error(`No published network named '${網路名}' at ${base}.`);
  const 網路網址 = resolveUrl(base, entry.hocon);
  const 讀JSON = async (檔) => JSON.parse(await 抓.讀(new URL(檔, `${base}/`).href));
  const { 結果們, 說明們 } = await 核.全部檢查({ 網路網址, fetchImpl: 抓, pageOrigin: pageOrigin ?? base, 讀JSON, 網路檔名: entry.hocon });
  const { 決定, 理由 } = 核.判定(核.翻譯(法典文字), 結果們);
  const 網路 = filterConfig(parseHocon(await 抓.讀(網路網址)));
  return { 放行: 放行.has(決定), 決定, 理由, 說明們, 指紋: 指紋(manifest, 網路), 網路名, 來源: base };
}

/** 擋下時給模型和畫面看的話（模型會照這段告訴訪客） */
export function 擋下說明(核, 查) {
  const 細 = (查.理由 || []).map((r) => `${核.英文器(r.器)} says ${r.代碼} → ${核.英文格(r.格)}${r.行 ? ` (law line ${r.行})` : ""}`).join("; ");
  return `Agentic Trust Hub blocked partner network '${查.網路名}' at ${new URL(查.來源).host}: decision ${核.英文格(查.決定)}${細 ? ` — ${細}` : ""}. None of its agents ran. 萬用插座擋下了這個夥伴網站，它的代理一個都沒有執行。`;
}

/**
 * 裝上閘門：包住 engine.resolveRemote（規矩 2）。onConsent 另由 site.js 用「卡片答案」包住（規矩 1）。
 * :param 回報: 每次判定後呼叫 ({查, 擋下, 原因})，給畫面顯示。
 */
export function 安裝閘門(engine, { 載入核心 = () => import(核心網址), 讀法典, 底fetch, pageOrigin, 回報, 私有資料白名單 = {} } = {}) {
  const 原 = engine.resolveRemote.bind(engine);
  const 已放行 = new Map();                 // 快取鍵 → 指紋（規矩 7）
  engine.resolveRemote = async (ref, chain, parentSpan, sourceManifest) => {
    const target = new URL(ref, `${engine.top.base}/`);
    const origin = new URL("./", target).href.replace(/\/$/, "");
    const 名 = target.pathname.split("/").filter(Boolean).pop();
    const 鍵 = engine.registry.cacheKey(origin, 名);
    // 規矩 3：不准的來源、循環、太深，先用官方的檢查擋，連碰都不碰
    engine._assertAllowedPeer(origin, sourceManifest);
    engine.registry.checkCycle(chain || [], origin, 名);
    // 規矩 7：快取裡只准有放行過的
    if (engine.registry.get(origin, 名)) {
      if (已放行.has(鍵)) return engine.registry.get(origin, 名);
      engine.registry.cache.delete(鍵);
    }
    let 核, 查;
    try {
      核 = await 載入核心();
      查 = await 檢查夥伴(origin, 名, { 核, 法典文字: await 讀法典(), 底fetch, pageOrigin });
    } catch (e) {
      // 規矩 8：閘門自己出錯＝讀不到＝擋下
      回報?.({ 擋下: true, 原因: "讀不到", 錯: String(e?.message || e), 來源: origin, 網路名: 名 });
      throw new Error(`Agentic Trust Hub could not check partner network '${名}' at ${new URL(origin).host}, so it was blocked: ${e?.message || e}. 萬用插座讀不到這個夥伴網站，一律擋下。`);
    }
    if (!查.放行) { 回報?.({ 查, 擋下: true, 原因: "法典" }); throw new Error(擋下說明(核, 查)); }
    const session = await 原(ref, chain, parentSpan, sourceManifest);
    // 規矩 6：比指紋
    // 兩邊都過同一個 filterConfig（它重複套用結果不變），別的網站用不同版的官方執行程式也比得準
    if (指紋(session.manifest, filterConfig(session.network.config)) !== 查.指紋) {
      engine.registry.cache.delete(鍵);
      回報?.({ 查, 擋下: true, 原因: "掉包" });
      throw new Error(`Agentic Trust Hub blocked partner network '${名}' at ${new URL(origin).host}: the files the runtime fetched are not the files the hub checked (bait-and-switch). None of its agents ran. 萬用插座擋下：執行程式抓到的和插座檢查的不一樣（掉包）。`);
    }
    // 規矩 9：這個目的地點名准的私有欄位才送出（裝在放行的那一個 session 上，快取再用時也一樣）
    const 准 = new Set(私有資料白名單[`${origin}/${名}`] ?? []);
    const 原invoke = session.invoke.bind(session);
    session.invoke = (request, 選項) => {
      const sly = request?.sly_data && typeof request.sly_data === "object" ? request.sly_data : {};
      const 送 = Object.fromEntries(Object.entries(sly).filter(([k]) => 准.has(k)));
      回報?.({ 查, 擋下: false, 私有資料: { 送出: Object.keys(送), 拿掉: Object.keys(sly).filter((k) => !准.has(k)) } });
      return 原invoke({ ...request, sly_data: 送 }, 選項);
    };
    已放行.set(鍵, 查.指紋);
    回報?.({ 查, 擋下: false });
    return session;
  };
  return engine;
}
