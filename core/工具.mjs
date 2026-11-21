// 接上的檢查工具。每個工具只交出一個代碼，翻成哪一格由白話法典決定。
// 接新工具＝這裡加一個函式＋法典加幾行。瀏覽器和命令列共用。
import { inspectNetworkUrl } from "../vendor/agent-customs/customs/inspect.js";
import { verifyAgentFacts } from "../vendor/nanda-seal/crypto-seal.js";

// 讀網站檔案的方式由呼叫的人給：瀏覽器用真的 fetch，命令列用讀資料夾的假 fetch。
export const 工具們 = {
  "進門檢查（Agent Customs）": async ({ 網路網址, fetchImpl, pageOrigin }) => {
    const 報告 = await inspectNetworkUrl(網路網址, { fetchImpl, pageOrigin });
    return { 代碼: 報告.verdict.code, 說明: 報告.verdict.summary };
  },
  "真偽檢查（NandaSeal）": async ({ 讀JSON, 網路檔名 }) => {
    let 章;
    try { 章 = await 讀JSON("agent-facts.signed.json"); } catch { return { 代碼: "MISSING_FACTS", 說明: "這個網站沒有簽章" }; }
    const 結果 = await verifyAgentFacts({ facts: 章, manifest: await 讀JSON("agent-manifest.json"), network: await 讀JSON(網路檔名) });
    return { 代碼: 結果.status, 說明: (結果.problems || 結果.reasons || []).join("；") || 結果.status };
  },
};

// 每個工具各跑一次；工具自己出錯，就記成「讀不到」，交給法典的「讀不到結果」那一行處理。
export async function 全部檢查(環境) {
  const 結果們 = {}, 說明們 = {};
  for (const [器, 跑] of Object.entries(工具們)) {
    try { const r = await 跑(環境); 結果們[器] = r.代碼; 說明們[器] = r.說明; }
    catch (e) { 結果們[器] = "讀不到"; 說明們[器] = String(e?.message || e); }
  }
  return { 結果們, 說明們 };
}
