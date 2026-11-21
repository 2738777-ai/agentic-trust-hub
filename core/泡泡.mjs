// 泡泡引擎：只照泡泡法典的轉移表走。瀏覽器和命令列共用（用內建的 crypto.subtle 算指紋）。
import { 轉移表 } from "./泡泡法典.mjs";

export class 泡泡被拒 extends Error {}

const 編碼 = new TextEncoder();
export async function 指紋(文字) {
  const 雜湊 = await crypto.subtle.digest("SHA-256", 編碼.encode(文字));
  return [...new Uint8Array(雜湊)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
const 穩定字串 = (o) => JSON.stringify(o, Object.keys(o).sort());

export class 泡泡池 {
  constructor() { this.泡泡們 = []; this.紀錄 = []; this.總鏈 = "0".repeat(16); this.總歷程 = []; }

  找(編號) { return this.泡泡們.find((p) => p.編號 === 編號); }

  // 照轉移表走一步；表上沒有就拒絕，而且拒絕本身也記下來
  #走(泡泡, 事件) {
    const 從 = 泡泡 ? 泡泡.狀態 : "門外";
    const 到 = 轉移表[`${從}|${事件}`];
    if (!到) {
      this.紀錄.push({ 編號: 泡泡?.編號 ?? null, 事件, 從, 結果: "拒絕" });
      throw new 泡泡被拒(`泡泡 ${泡泡?.編號 ?? "（還沒包）"} 在「${從}」不能「${事件}」`);
    }
    return 到;
  }

  async #重算(泡泡, 這次) {
    泡泡.鏈 = await 指紋(泡泡.鏈 + "|" + 穩定字串(這次));
    泡泡.歷程.push({ ...這次, 鏈: 泡泡.鏈 });
    // 總鏈：整個池子發生過的每一件事照順序串起來，整顆泡泡被刪掉也抓得到
    this.總鏈 = await 指紋(this.總鏈 + "|" + 泡泡.編號 + "|" + 泡泡.鏈);
    this.總歷程.push({ 編號: 泡泡.編號, 泡泡鏈: 泡泡.鏈, 總鏈: this.總鏈 });
  }

  // 訊號一進門就包：記下從哪裡來、誰帶進來、內容指紋；子泡泡從父泡泡的鏈值接下去
  async 包({ 種類, 來源, 內容 }, 父編號 = null) {
    const 父 = 父編號 ? this.找(父編號) : null;
    if (父編號 && !父) throw new 泡泡被拒(`找不到父泡泡 ${父編號}`);
    if (父 && 父.狀態 === "剪斷") {   // 父已剪斷：子泡泡一出生就剪斷，不准進來
      this.紀錄.push({ 編號: null, 事件: "包", 從: "門外", 結果: "拒絕（父泡泡已剪斷）" });
      throw new 泡泡被拒(`父泡泡 ${父.編號} 已剪斷，同一條繩上的新訊號不准進來`);
    }
    const 到 = this.#走(null, "包");
    const 泡泡 = {
      編號: `泡${this.泡泡們.length + 1}`, 種類, 來源, 父編號,
      繩頭: 父 ? 父.繩頭 : `泡${this.泡泡們.length + 1}`,
      內容指紋: await 指紋(typeof 內容 === "string" ? 內容 : JSON.stringify(內容)),
      狀態: 到, 章們: [], 決定: null, 鏈: 父 ? 父.鏈 : "0".repeat(16), 歷程: [],
    };
    const 接自 = 泡泡.鏈;   // 子泡泡接在父泡泡「現在」的鏈值後面：這就是因果鏈的扣環
    await this.#重算(泡泡, { 事件: "包", 種類, 來源, 父編號, 內容指紋: 泡泡.內容指紋 });
    泡泡.歷程[0].接自 = 接自;
    this.泡泡們.push(泡泡);
    this.紀錄.push({ 編號: 泡泡.編號, 事件: "包", 從: "門外", 結果: 到 });
    return 泡泡;
  }

  async 蓋章(編號, { 器, 代碼, 格 }) {
    const 泡泡 = this.找(編號), 到 = this.#走(泡泡, "蓋章");
    泡泡.章們.push({ 器, 代碼, 格 });
    泡泡.狀態 = 到;
    await this.#重算(泡泡, { 事件: "蓋章", 器, 代碼, 格 });
    this.紀錄.push({ 編號, 事件: "蓋章", 結果: 到 });
  }

  async 判定(編號, 決定) {
    const 泡泡 = this.找(編號), 到 = this.#走(泡泡, "判定");
    泡泡.決定 = 決定; 泡泡.狀態 = 到;
    await this.#重算(泡泡, { 事件: "判定", 決定 });
    this.紀錄.push({ 編號, 事件: "判定", 結果: 到 });
  }

  // 剪斷：同一條繩（同一個繩頭）上還沒剪的泡泡，全部剪斷
  async 剪斷(編號, 原因) {
    const 起點 = this.找(編號);
    const 同繩 = this.泡泡們.filter((p) => p.繩頭 === 起點.繩頭 && p.狀態 !== "剪斷");
    for (const p of 同繩) {
      const 到 = this.#走(p, "剪斷");
      p.狀態 = 到;
      await this.#重算(p, { 事件: "剪斷", 原因, 起點: 編號 });
      this.紀錄.push({ 編號: p.編號, 事件: "剪斷", 結果: 到 });
    }
    return 同繩.map((p) => p.編號);
  }
}

// 驗鏈：照歷程從頭重算一次，任何一個字被改過都會對不上，回報第一個對不上的地方。
// 子泡泡還要確認：它扣上的那個鏈值，真的出現在父泡泡的歷程裡（因果關係是真的，不是編的）。
export async function 驗鏈(泡泡們) {
  const 依編號 = Object.fromEntries(泡泡們.map((p) => [p.編號, p]));
  for (const p of 泡泡們) {
    const 第一筆 = p.歷程[0];
    if (!第一筆) return { 好: false, 位置: `${p.編號} 沒有歷程` };
    let 鏈 = 第一筆.接自;
    if (p.父編號) {
      const 父 = 依編號[p.父編號];
      if (!父) return { 好: false, 位置: `${p.編號} 的父泡泡 ${p.父編號} 不見了` };
      const 父的鏈值們 = [父.歷程[0]?.接自, ...父.歷程.map((h) => h.鏈)];
      if (!父的鏈值們.includes(鏈)) return { 好: false, 位置: `${p.編號} 說自己接在 ${p.父編號} 後面，但父泡泡的歷程裡沒有這個扣環` };
    } else if (鏈 !== "0".repeat(16)) {
      return { 好: false, 位置: `${p.編號} 沒有父泡泡，起點卻不是零` };
    }
    for (const [i, h] of p.歷程.entries()) {
      const { 鏈: 記的, 接自, ...這次 } = h;
      const 算的 = await 指紋(鏈 + "|" + 穩定字串(這次));
      if (算的 !== 記的) return { 好: false, 位置: `${p.編號} 第 ${i + 1} 筆（${這次.事件}）對不上` };
      鏈 = 算的;
    }
    if (鏈 !== p.鏈) return { 好: false, 位置: `${p.編號} 最後的鏈值對不上` };
  }
  return { 好: true };
}

// 驗總鏈：池子的總歷程照順序重算；每一筆指到的泡泡和鏈值都必須真的存在
export async function 驗總鏈(池) {
  const 依編號 = Object.fromEntries(池.泡泡們.map((p) => [p.編號, p]));
  let 鏈 = "0".repeat(16);
  for (const [i, h] of 池.總歷程.entries()) {
    const p = 依編號[h.編號];
    if (!p) return { 好: false, 位置: `總歷程第 ${i + 1} 筆指到的 ${h.編號} 不見了` };
    if (!p.歷程.some((x) => x.鏈 === h.泡泡鏈)) return { 好: false, 位置: `總歷程第 ${i + 1} 筆和 ${h.編號} 的歷程對不上` };
    鏈 = await 指紋(鏈 + "|" + h.編號 + "|" + h.泡泡鏈);
    if (鏈 !== h.總鏈) return { 好: false, 位置: `總歷程第 ${i + 1} 筆的總鏈對不上` };
  }
  if (鏈 !== 池.總鏈) return { 好: false, 位置: "最後的總鏈對不上（有東西被刪了）" };
  const 數 = 池.泡泡們.reduce((n, p) => n + p.歷程.length, 0);
  if (數 !== 池.總歷程.length) return { 好: false, 位置: `泡泡歷程共 ${數} 筆，總歷程卻有 ${池.總歷程.length} 筆` };
  return { 好: true };
}
