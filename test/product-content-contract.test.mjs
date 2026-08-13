// product-content-contract の試験（node 組み込み test・依存なし）。
// 実行: npm run test:product-content  /  node --test test/product-content-contract.test.mjs
//
// 見ているものは3つ:
//   1. 現行の商品 JSON が Zod を通ること（切り出しで意味が変わっていないこと）
//   2. 壊すと対応する ruleId が発火すること（守りが在ること）
//   3. **正本 digest が Python 側と一致すること**（言語をまたいだ同一性）
//
// 3 が要るのは、提案する側（MiocaOS・Python）と検査する側（ここ・Node）が別の言語で
// 同じ「内容の同一性」を計算するから。1文字でもずれると、同じ内容が両側で別の digest を
// 持ち、冪等性の取っ手（同じ仮説・同じ中身なら PR は1本）が壊れる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonical, inspect, sha256, CONTRACT_ID } from '../scripts/validate-product-content.mjs';
import { productSchema } from '../src/content/products.schema.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const errors = (report) => report.diagnostics.filter((d) => d.severity === 'error');
const rules = (report) => report.diagnostics.map((d) => d.ruleId);

const PRODUCTS = ['src/content/products/ja/mioca-loan.json',
                  'src/content/products/ja/ai-deck-studio.json',
                  'src/content/products/ja/ai-learning-roadmap.json',
                  'src/content/products/en/ai-deck-studio.json',
                  'src/content/products/en/ai-learning-roadmap.json'];

// ── 1. 切り出しで意味が変わっていないこと ────────────────────────────────

test('現行の商品 JSON はすべて Zod を通る', () => {
  for (const rel of PRODUCTS) {
    const parsed = productSchema.safeParse(read(rel));
    assert.equal(parsed.success, true, `${rel}: ${JSON.stringify(parsed.error?.issues ?? [])}`);
  }
});

test('現行の商品 JSON に error 級の診断は無い（warn は在ってよい）', () => {
  for (const rel of PRODUCTS) {
    const report = inspect(read(rel), path.basename(rel));
    assert.deepEqual(errors(report), [], `${rel}: ${JSON.stringify(errors(report))}`);
  }
});

// ── 2. 壊すと発火すること ────────────────────────────────────────────────

const base = () => read('src/content/products/ja/mioca-loan.json');

test('価格が 0 以下なら Zod が落とす', () => {
  const report = inspect({ ...base(), price: 0 });
  assert.equal(report.valid, false);
  assert.ok(rules(report).includes('ZOD'));
});

test('checkout URL が許可ホストでなければ落ちる', () => {
  const report = inspect({ ...base(), stripeLink: 'https://evil.example.com/pay' });
  assert.equal(report.valid, false);
  assert.ok(rules(report).includes('C4'));
});

test('通貨の列挙外は落ちる', () => {
  assert.equal(inspect({ ...base(), currency: 'EUR' }).valid, false);
});

test('プレースホルダは C4 で落ちる（Zod は通っても）', () => {
  const report = inspect({ ...base(), aiNote: 'TODO: 後で書く' });
  assert.equal(report.valid, true, 'Zod は形しか見ない');
  assert.ok(errors(report).some((d) => d.ruleId === 'C4'));
});

test('必須キーが欠ければ C1 と ZOD の両方が鳴る', () => {
  const { cta, ...without } = base();
  const report = inspect(without);
  assert.ok(rules(report).includes('C1') && rules(report).includes('ZOD'));
});

// ── 3. 出力が安定していること ────────────────────────────────────────────

test('診断の並びは ruleId 昇順で固定（fingerprint を揺らさない）', () => {
  const report = inspect({ ...base(), price: 0, stripeLink: 'https://x.example/y',
                           aiNote: 'TODO' });
  const ids = rules(report);
  assert.deepEqual(ids, [...ids].sort(), `並びが揺れている: ${ids}`);
});

test('契約 id を名乗る', () => {
  assert.equal(inspect(base()).contractId, CONTRACT_ID);
});

// ── 4. 言語をまたいだ同一性 ──────────────────────────────────────────────

test('鍵の順が違う同値な object は同じ digest', () => {
  const product = base();
  const shuffled = Object.fromEntries(Object.entries(product).reverse());
  assert.equal(sha256(canonical(shuffled)), sha256(canonical(product)));
});

test('Unicode の合成/分解を寄せる（NFC）', () => {
  const composed = { ...base(), title: 'パ' };          // 合成済み
  const decomposed = { ...base(), title: 'パ' };   // ハ + 半濁点
  assert.equal(sha256(canonical(composed)), sha256(canonical(decomposed)));
});

test('正本 digest が Python 実装（MiocaOS decision/lp_pr.py）と一致する', () => {
  // 下の値は MiocaOS 側の `content_sha256(mioca-loan.json)` の実測（2026-08-13）。
  // ここが割れたら、**どちらかの正規化が変わった**ということ——直すのは digest では
  // なく、規則を揃える方。
  assert.equal(
    sha256(canonical(read('src/content/products/ja/mioca-loan.json'))),
    'cce27ec1125fc86cff5e053f8b3446321d4a48cc5901c833369e5bae9fde904d',
  );
});

test('正本には空白も末尾改行も入らない', () => {
  const text = canonical(base());
  assert.ok(!text.includes(', "'), '区切りに空白が入っている');
  assert.ok(!text.endsWith('\n'));
});
