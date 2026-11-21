// 打包入口：瀏覽器要用的核心全部從這裡出去，打包成 web/核心包.js（node tools/打包.mjs）。
// 兩頁共用同一個包，看過一頁，另一頁就不用再下載。
export * from "../core/翻譯器.mjs";
export * from "../core/工具.mjs";
export * from "../core/泡泡.mjs";
export * from "../core/視角法典.mjs";
export * from "../core/視角.mjs";
