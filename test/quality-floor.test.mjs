// quality-floor の純関数テスト（node 組み込み test・依存なし）。
// 実行: npm run test:quality-floor  /  node --test test/quality-floor.test.mjs
// 実ファイル（tokens.css・現行商品 JSON）が床を通ること＋劣化させると対応 id が発火することを両方検証。

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseTokens, relLuminance, checkTokens, checkAstroRawHex, checkProductJson,
  BASELINE_TOKEN_KEYS,
} from "../scripts/quality-floor-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const ids = (arr) => arr.map((x) => x.id);
const blocks = (arr) => arr.filter((x) => x.severity === "block");

// ── 純関数の単体 ──────────────────────────────────────────────
test("relLuminance: 白は高・近黒は低", () => {
  assert.ok(relLuminance("#ffffff") > 0.99);
  assert.ok(relLuminance("#fafafa") > 0.9);
  assert.ok(relLuminance("#14171f") < 0.05);
});

test("parseTokens: :root の変数を拾う", () => {
  const { values, keys } = parseTokens(":root{ --accent:#0095f6; /* c */ --bg:#fafafa; }");
  assert.equal(values["--accent"], "#0095f6");
  assert.ok(keys.has("--bg"));
});

// ── A: 実 tokens.css は床を通る／劣化で発火 ─────────────────────
test("A: 実 tokens.css は block 0", () => {
  const found = checkTokens(read("src/styles/tokens.css"));
  assert.equal(blocks(found).length, 0, JSON.stringify(found));
});

test("A2: accent 多色化で block", () => {
  const css = read("src/styles/tokens.css").replace("--accent: #0095f6", "--accent: #ff3300");
  assert.ok(ids(checkTokens(css)).includes("A2"));
});

test("A3: ダーク顔化で block", () => {
  const css = read("src/styles/tokens.css").replace("--bg: #fafafa", "--bg: #101014");
  assert.ok(ids(checkTokens(css)).includes("A3"));
});

test("A4: キー追加で block", () => {
  const css = read("src/styles/tokens.css").replace(":root {", ":root {\n  --rogue-key: #123456;");
  assert.ok(ids(checkTokens(css)).includes("A4"));
});

test("A4: ベースラインキー数は 38", () => {
  assert.equal(new Set(BASELINE_TOKEN_KEYS).size, 38);
});

// ── A1: .astro 生 hex ─────────────────────────────────────────
test("A1: 黒白 mask/on-accent は許可", () => {
  const src = "<style>.x{color:#fff} .y{-webkit-mask:linear-gradient(#000 0 0)} .z{background:var(--lp-grad)}</style>";
  assert.equal(checkAstroRawHex("x.astro", src).length, 0);
});

test("A1: 生ブランド色は warn（craft ヒント・機械は .astro 非対象）", () => {
  const found = checkAstroRawHex("x.astro", "<style>.x{color:#0095f6}</style>");
  const a1 = found.find((x) => x.id === "A1");
  assert.ok(a1 && a1.severity === "warn");
});

// ── C: 実商品 JSON は床を通る／劣化で発火 ───────────────────────
const PRODUCT = "src/content/products/ja/ai-deck-studio.json";

test("C: 実商品 JSON(ai-deck-studio) は block 0", () => {
  const obj = JSON.parse(read(PRODUCT));
  assert.equal(blocks(checkProductJson(PRODUCT, obj)).length, 0, JSON.stringify(blocks(checkProductJson(PRODUCT, obj))));
});

test("C1: 必須キー欠落で block", () => {
  const obj = JSON.parse(read(PRODUCT)); delete obj.faq; delete obj.headline;
  assert.ok(ids(checkProductJson(PRODUCT, obj)).includes("C1"));
});

test("C4: stripeLink 不正で block", () => {
  const obj = JSON.parse(read(PRODUCT)); obj.stripeLink = "https://example.com/pay";
  assert.ok(ids(checkProductJson(PRODUCT, obj)).includes("C4"));
});

test("C4: Lemon Squeezy の checkout URL は通る（多provider・CK-6）", () => {
  const obj = JSON.parse(read(PRODUCT)); obj.stripeLink = "https://mystore.lemonsqueezy.com/checkout/abc";
  assert.ok(!ids(checkProductJson(PRODUCT, obj)).includes("C4"));  // block しない
});

test("C4: プレースホルダで block", () => {
  const obj = JSON.parse(read(PRODUCT)); obj.lead = "TODO ここに説明";
  assert.ok(ids(checkProductJson(PRODUCT, obj)).includes("C4"));
});

test("C2: 薄い deliver で warn", () => {
  const obj = JSON.parse(read(PRODUCT)); obj.deliver = obj.deliver.slice(0, 2);
  const found = checkProductJson(PRODUCT, obj);
  const c2 = found.find((x) => x.id === "C2");
  assert.ok(c2 && c2.severity === "warn");
});
