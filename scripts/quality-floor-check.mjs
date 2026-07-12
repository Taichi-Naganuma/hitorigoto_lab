// quality-floor-check.mjs — トップ/os 同等以上の「受入フロア」を機械可検査にするゲート。
// 正本設計: my-portfolio Trains/docs/design/planned/quality-floor-standard-design.md（§3 が数値の真実源）。
// 憲法: hitorigoto-lab/DESIGN-INVARIANTS.md（§1 顔・§4 品質フロア）。
//
// 挙動: QUALITY_FLOOR_ENFORCE 既定 "0" → 常に exit 0（warn-only・レポートのみ）。"1" → block 重症度の
//       fail が 1 件でも exit 1。warn は exit に影響しない。依存なし（node 組み込みのみ）。
//
// このファイルは「純関数の検査 + 薄い I/O 殻」。純関数群は export し、test/quality-floor.test.mjs が食う。

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

// ── §3 の一次定数（設計 §3 と同期。改訂時は両方を直す）─────────────────────────
// tokens.css :root の変数キー集合のベースライン（A4＝機械は値のみ可・キー増減禁止）。
export const BASELINE_TOKEN_KEYS = [
  "--accent", "--accent-ink", "--edge-cyan", "--edge-purple", "--edge-grad", "--round-face",
  "--ink", "--sub", "--line", "--bg", "--card", "--soft", "--font-ja", "--font-en",
  "--lp-ink", "--lp-ink2", "--lp-sub", "--lp-faint", "--lp-line", "--lp-line2", "--lp-card", "--lp-soft",
  "--r-pill", "--r-card", "--stagger", "--rise-ease",
  "--lp-accent", "--lp-accent-ink", "--lp-grad-a", "--lp-grad-b", "--lp-grad", "--lp-round",
  "--fx-accent", "--fx-accent-ink", "--fx-grad-a", "--fx-grad-b", "--fx-grad", "--fx-round",
];
// A2 憲法固定色（§1-2）。
export const SANCTIONED = { "--accent": "#0095f6", "--edge-cyan": "#22d3ee", "--edge-purple": "#8b5cf6" };
// A3 全面ライト（§1-1）＝相対輝度がこの床以上。
export const LIGHT_KEYS = ["--bg", "--card", "--lp-card", "--soft", "--lp-soft"];
export const LIGHT_LUMINANCE_FLOOR = 0.85;
// A1 .astro scoped style で許可する生 hex（黒白＝mask 技法／on-accent 文字。ブランド色は var(--…) 必須）。
export const HEX_ALLOWLIST = new Set(["#fff", "#ffffff", "#000", "#000000"]);
// C1 商品コンテンツの必須キー（ProductPage.astro Props の非任意＋SEO）。
export const REQUIRED_KEYS = [
  "title", "description", "headline", "lead", "priceDisplay", "cta", "ctaNote",
  "stripeLink", "deliver", "steps", "target", "faq", "aiNote",
];
// C6 誇大表現 banned（軽量 backstop。正典リストは Trains generation-quality-doctrine=上流）。
export const BANNED = [/絶対に?儲か/, /必ず儲か/, /100\s*[%％]\s*保証/, /完全保証/, /業界\s*no\.?\s*1/i, /日本一/];

// ── 純関数群 ──────────────────────────────────────────────────────────────────
const f = (id, severity, message) => ({ id, severity, message });
const nonEmpty = (v) =>
  (typeof v === "string" && v.trim().length > 0) || (Array.isArray(v) && v.length > 0);
const clen = (s) => (typeof s === "string" ? Array.from(s).length : 0);

export function relLuminance(hex) {
  const m = String(hex).trim().replace(/^#/, "");
  const lin = (h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  let r, g, b;
  if (m.length === 3) { r = lin(m[0] + m[0]); g = lin(m[1] + m[1]); b = lin(m[2] + m[2]); }
  else if (m.length === 6) { r = lin(m.slice(0, 2)); g = lin(m.slice(2, 4)); b = lin(m.slice(4, 6)); }
  else return NaN;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// tokens.css の :root から {values, keys} を得る（コメント除去 → --x: v; を収集）。
export function parseTokens(css) {
  const rootMatch = String(css).match(/:root\s*\{([\s\S]*?)\}/);
  const body = (rootMatch ? rootMatch[1] : String(css)).replace(/\/\*[\s\S]*?\*\//g, "");
  const values = {};
  const keys = new Set();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    keys.add(m[1]);
    values[m[1]] = m[2].trim();
  }
  return { values, keys };
}

export function checkTokens(css) {
  const out = [];
  const { values, keys } = parseTokens(css);
  for (const [k, want] of Object.entries(SANCTIONED)) {
    if ((values[k] || "").toLowerCase() !== want) {
      out.push(f("A2", "block", `${k} は憲法固定色 ${want}（現=${values[k] ?? "未定義"}・多色化禁止 §1-2）`));
    }
  }
  for (const k of LIGHT_KEYS) {
    const v = values[k];
    const lum = v && /^#[0-9a-fA-F]{3,6}$/.test(v) ? relLuminance(v) : NaN;
    if (!(lum >= LIGHT_LUMINANCE_FLOOR)) {
      out.push(f("A3", "block", `${k}=${v ?? "未定義"} は全面ライト床(輝度≥${LIGHT_LUMINANCE_FLOOR})未満（§1-1）`));
    }
  }
  const base = new Set(BASELINE_TOKEN_KEYS);
  const added = [...keys].filter((k) => !base.has(k));
  const removed = [...base].filter((k) => !keys.has(k));
  if (added.length || removed.length) {
    out.push(f("A4", "block",
      `トークンキーの増減禁止（値のみ可 §2）: 追加=${added.join(",") || "なし"} 削除=${removed.join(",") || "なし"}`));
  }
  return out;
}

// .astro の <style> 内の生 hex（許可＝黒白のみ）。ブランド色は var(--…) 参照が望ましい。
// severity=warn: 機械は .astro を触らない（content+tokens のみ）ため A1 は craft 専用ヒント。かつ現行 craft
// コンポーネント（HomeLanding/OsLanding 等＝トップ/os 参照）が brand hex を直書きしており、block にすると
// 「床＝参照が定義上 pass」を壊す。block の歯は機械が触る面（A2/A3/A4・C1/C4）に集約する。
export function checkAstroRawHex(file, src) {
  const out = [];
  const seen = new Set();
  for (const sm of String(src).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const hm of sm[1].matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const hex = hm[0].toLowerCase();
      if (!HEX_ALLOWLIST.has(hex)) seen.add(hm[0]);
    }
  }
  if (seen.size) out.push(f("A1", "warn", `${file}: 生 hex ${[...seen].join(", ")}（ブランド色は var(--…) 参照が望ましい）`));
  return out;
}

// 商品コンテンツ JSON（ProductPage 用）を床基準で検査。
export function checkProductJson(file, obj) {
  const out = [];
  if (!obj || typeof obj !== "object") { out.push(f("C1", "block", `${file}: JSON が object でない`)); return out; }

  // C1 必須キー非空
  const missing = REQUIRED_KEYS.filter((k) => !nonEmpty(obj[k]));
  if (missing.length) out.push(f("C1", "block", `${file}: 必須キー欠落/空 = ${missing.join(", ")}`));

  // C2 最小 richness（warn→block 昇格対象＝QF-6）
  const r2 = [];
  if (!(Array.isArray(obj.deliver) && obj.deliver.length >= 4)) r2.push("deliver≥4");
  else if (!obj.deliver.every((d) => clen(d && d.body) >= 40)) r2.push("deliver.body≥40字");
  if (!(Array.isArray(obj.steps) && obj.steps.length >= 3)) r2.push("steps≥3");
  if (!(Array.isArray(obj.target) && obj.target.length >= 3)) r2.push("target≥3");
  if (!(Array.isArray(obj.faq) && obj.faq.length >= 4)) r2.push("faq≥4");
  else if (!obj.faq.every((q) => clen(q && q.a) >= 40)) r2.push("faq.a≥40字");
  if (clen(obj.lead) < 60 || !/<b>/.test(obj.lead || "")) r2.push("lead≥60字かつ<b>");
  if (clen(obj.headline) < 8) r2.push("headline≥8字");
  if (r2.length) out.push(f("C2", "warn", `${file}: richness 不足 = ${r2.join(", ")}`));

  // C3 信頼/安全の内容
  const r3 = [];
  if (!(Array.isArray(obj.faq) && obj.faq.some((q) => /返金|refund/i.test((q && q.a) || "")))) r3.push("faqに返金条項");
  if (!nonEmpty(obj.aiNote)) r3.push("aiNote");
  if (!/Stripe|安全/i.test(obj.ctaNote || "")) r3.push("ctaNoteにStripe/安全");
  if (r3.length) out.push(f("C3", "warn", `${file}: 信頼/安全の内容 = ${r3.join(", ")}`));

  // C4 プレースホルダ/不正 Stripe
  if (!/^https:\/\/buy\.stripe\.com\//.test(obj.stripeLink || "")) {
    out.push(f("C4", "block", `${file}: stripeLink が buy.stripe.com でない（${obj.stripeLink ?? "未定義"}）`));
  }
  const blob = JSON.stringify(obj);
  const ph = blob.match(/TODO|lorem|ダミー|placeholder|未定|xxx/i);
  if (ph) out.push(f("C4", "block", `${file}: プレースホルダ検出（${ph[0]}）`));

  // C5 numbers backstop（正典 numbers_grounded は上流 Trains・再実装しない＝ここは warn）
  if (/(\d{2,}\s*[%％]|[\d,]{4,}\s*(社|名|件|人))/.test(blob)) {
    out.push(f("C5", "warn", `${file}: 実績風の数値。上流 numbers_grounded で接地必須（捏造不可）`));
  }

  // C6 banned（誇大表現 backstop）
  const hitB = BANNED.find((re) => re.test(blob));
  if (hitB) out.push(f("C6", "warn", `${file}: banned フレーズ（${hitB}）`));

  return out;
}

// 新規/変更のページ .astro の構造署名（fx・レスポンシブ・reduced-motion）。warn（QF-6 で B2/B4 昇格）。
export function checkPageStructure(file, src) {
  const out = [];
  const s = String(src);
  const b2 = [];
  if (!/\bfx-rise\b/.test(s)) b2.push(".fx-rise");
  if (!/\bfx-ring\b/.test(s)) b2.push(".fx-ring");
  if (!(/background-clip:\s*text/.test(s) || /\bfx-grad-text\b/.test(s) || /--lp-grad/.test(s))) b2.push("グラデlabel");
  if (b2.length) out.push(f("B2", "warn", `${file}: fx 署名不足 = ${b2.join(", ")}`));
  const b4 = [];
  if (!/@media[^\{]*max-width/.test(s)) b4.push("@media(max-width)");
  if (!/prefers-reduced-motion/.test(s)) b4.push("prefers-reduced-motion");
  if (b4.length) out.push(f("B4", "warn", `${file}: レスポンシブ/モーション配慮不足 = ${b4.join(", ")}`));
  return out;
}

// ── I/O 殻 ────────────────────────────────────────────────────────────────────
function safeRead(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

function changedFiles(root, base) {
  // origin/main...HEAD の差分。取得できなければ null（呼び出し側で all フォールバック）。
  for (const cmd of [`git diff --name-only ${base}...HEAD`, `git diff --name-only ${base} HEAD`]) {
    try {
      const out = execSync(cmd, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString();
      return out.split("\n").map((x) => x.trim()).filter(Boolean);
    } catch { /* try next */ }
  }
  return null;
}

function walk(dir, test, acc = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== "dist" && !e.name.startsWith(".")) walk(p, test, acc); }
    else if (test(p)) acc.push(p);
  }
  return acc;
}

export function runChecks({ root, scope, changed }) {
  const findings = [];
  const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
  const inScope = (relPath) => scope === "all" || (changed && changed.includes(relPath));

  // A2/A3/A4 tokens は常時（機械が最も触る面）。
  const tokCss = safeRead(path.join(root, "src/styles/tokens.css"));
  if (tokCss != null) findings.push(...checkTokens(tokCss));
  else findings.push(f("A0", "warn", "src/styles/tokens.css が読めない"));

  // A1 .astro 生 hex（scope 内の components/pages）。
  const astros = walk(path.join(root, "src"), (p) => p.endsWith(".astro"));
  for (const p of astros) {
    const r = rel(p);
    if (!inScope(r)) continue;
    findings.push(...checkAstroRawHex(r, safeRead(p) || ""));
    // 構造チェックは「本体コンポーネント」（*Landing/*Page/*SubPage）のみ。薄いページラッパ
    // （HomeLanding 等を import するだけの src/pages/*.astro）は import 先に委譲＝偽陽性を避ける。
    if (/\/components\/[A-Za-z]*(Landing|Page|SubPage)\.astro$/.test(r)) {
      findings.push(...checkPageStructure(r, safeRead(p) || ""));
    }
  }

  // B/C 商品コンテンツ JSON。
  const prodDir = path.join(root, "src/content/products");
  const jsons = walk(prodDir, (p) => p.endsWith(".json"));
  for (const p of jsons) {
    const r = rel(p);
    if (!inScope(r)) continue;
    let obj = null, bad = false;
    try { obj = JSON.parse(safeRead(p) || "null"); } catch { bad = true; }
    if (bad) { findings.push(f("C1", "block", `${r}: JSON parse 失敗`)); continue; }
    findings.push(...checkProductJson(r, obj));
  }

  // D1 帰属コンポーネントの非破壊（存在の安全網・warn）。
  if (!fs.existsSync(path.join(root, "src/components/StripeAttribution.astro"))) {
    findings.push(f("D1", "warn", "StripeAttribution.astro が見当たらない（帰属導線の非破壊を確認）"));
  }
  return findings;
}

function isMain() {
  // クロスプラットフォーム（Windows の /C:/… pathname 問題を回避）。
  try { return import.meta.url === pathToFileURL(process.argv[1]).href; }
  catch { return false; }
}

if (isMain()) {
  const root = process.cwd();
  const ENFORCE = process.env.QUALITY_FLOOR_ENFORCE === "1";
  const scope = (process.env.QUALITY_FLOOR_SCOPE || "changed").trim();
  const base = (process.env.QUALITY_FLOOR_BASE || "origin/main").trim();

  let changed = null, effectiveScope = scope;
  if (scope !== "all") {
    changed = changedFiles(root, base);
    if (changed == null) { effectiveScope = "all"; console.log(`[quality-floor] diff(${base}) 取得不可 → scope=all にフォールバック`); }
  }
  const findings = runChecks({ root, scope: effectiveScope, changed });

  const order = { block: 0, warn: 1 };
  findings.sort((a, b) => (order[a.severity] - order[b.severity]) || a.id.localeCompare(b.id));
  const blocks = findings.filter((x) => x.severity === "block");
  const warns = findings.filter((x) => x.severity === "warn");

  console.log(`\n=== Quality Floor（トップ/os 同等以上）scope=${effectiveScope} ENFORCE=${ENFORCE ? "1" : "0"} ===`);
  if (!findings.length) console.log("  [PASS] 指摘なし");
  for (const x of findings) console.log(`  [${x.severity === "block" ? "BLOCK" : "WARN "}] ${x.id} ${x.message}`);
  console.log(`--- block=${blocks.length} warn=${warns.length}`);
  if (!ENFORCE) console.log("  （warn-only: QUALITY_FLOOR_ENFORCE=1 で block をブロッキング化）");

  process.exit(ENFORCE && blocks.length ? 1 : 0);
}
