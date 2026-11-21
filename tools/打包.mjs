// 把瀏覽器用的核心打包壓成一個檔：node tools/打包.mjs
// 原始碼還是 core/ 和 vendor/；web/核心包.js 是產出來的，不要手改。測試會檢查它是不是最新的。
// 需要 esbuild：npm install（開發用，網站本身不需要）
import { build } from "esbuild";
import path from "node:path";

const 根 = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const 出 = process.argv[2] || path.join(根, "web", "核心包.js");
await build({
  entryPoints: [path.join(根, "web", "入口.mjs")],
  bundle: true, minify: true, format: "esm", charset: "utf8", target: "es2022",
  legalComments: "eof", outfile: 出, logLevel: "warning",
  banner: { js: "// 產出檔：由 tools/打包.mjs 從 core/、vendor/ 打包。不要手改。授權見 NOTICE。" },
});
console.log("打包好了：" + path.relative(根, 出));
