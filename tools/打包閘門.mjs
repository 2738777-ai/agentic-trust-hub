// 把萬用插座閘門打包成一個檔，給別的代理網站一行裝上：node tools/打包閘門.mjs [--check]
// 原始碼是 gate/入口.mjs、trust-gate.js、core/、vendor/、runtime/ 的幾個函式；gate/trust-hub-gate.js 是產出來的，不要手改。
import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const 根 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const 出 = path.join(根, "gate", "trust-hub-gate.js");
const r = await build({
  entryPoints: [path.join(根, "gate", "入口.mjs")],
  bundle: true, minify: true, format: "esm", charset: "utf8", target: "es2022", write: false,
  loader: { ".txt": "text" }, legalComments: "eof", logLevel: "warning",
  banner: { js: "// Trust Hub Gate — built by tools/打包閘門.mjs from 2738777-ai/agentic-trust-hub. Do not edit. Licenses: see NOTICE (Apache-2.0, MIT)." },
});
const 新 = r.outputFiles[0].text;
if (process.argv.includes("--check")) {
  const 舊 = await readFile(出, "utf8").catch(() => "");
  if (舊 !== 新) { console.error("gate/trust-hub-gate.js 不是最新的：node tools/打包閘門.mjs"); process.exit(1); }
  console.log("gate/trust-hub-gate.js 是最新的");
} else {
  await writeFile(出, 新);
  console.log(`打包好了：gate/trust-hub-gate.js（${(新.length / 1024).toFixed(0)} KB）`);
}
