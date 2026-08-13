// validate-product-content.mjs — product JSON を「CI と同じ検査」に掛ける読み取り専用 CLI。
//
//   node scripts/validate-product-content.mjs --input <file> [--format json]
//
// 何のために在るか: LP のコンテンツを機械（MiocaOS）が提案するとき、**PR を出す前に**
// 同じ判定を掛けられるようにするため。これが無いと CI が最初の検査になり、壊れた候補が
// レビュー面に流れて、失敗したときの戻し方が曖昧になる。
//
// **判定を書き直していない。** Zod は src/content/products.schema.mjs（astro build が
// 使う定義そのもの）、品質フロア C1〜C6 は scripts/quality-floor-check.mjs の
// `checkProductJson`（既に I/O の無い純関数として export されている）を**そのまま呼ぶ**。
// 似た検査を2つ持つと、片方だけ直った日に「生成時は通るが CI で落ちる」が生まれる。
//
// 書かない・出さない: ファイルを書き換えない、ネットワークに出ない、git を触らない。
// 標準出力に診断 JSON を1つ出すだけ。
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { productSchema } from '../src/content/products.schema.mjs';
import { checkProductJson } from './quality-floor-check.mjs';

export const CONTRACT_ID = 'hitorigoto-lab-product-content@1.0.0';

/** 正本の文字列（UTF-8 / NFC / 鍵は昇順 / 区切りは , と : / 末尾改行なし）。
 *
 *  MiocaOS 側（decision/lp_pr.py:canonical_product）と**同じ規則**。ここが1文字でも
 *  ずれると、同じ内容が両側で別の digest を持ち、冪等性の取っ手が壊れる。
 *  跨ぐ言語が2つある以上、実装は2つ在らざるを得ない——だから
 *  test/product-content-contract.test.mjs が Python が出した digest と突き合わせる。 */
export function canonical(value) {
  const nfc = (v) => {
    if (typeof v === 'string') return v.normalize('NFC');
    if (Array.isArray(v)) return v.map(nfc);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k.normalize('NFC')] = nfc(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(nfc(value)).normalize('NFC');
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** JSON Pointer（RFC 6901）へ。Zod の path 配列をそのまま径にする。 */
function pointer(parts) {
  if (!parts || !parts.length) return '';
  return '/' + parts.map((p) => String(p).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

/** 診断を1つの安定した形で返す【純関数・I/O なし】。
 *
 *  並びは ruleId 昇順 → jsonPointer 昇順で固定する。出力順が揺れると、同じ入力から
 *  違う fingerprint が出る。 */
export function inspect(product, label = '(input)') {
  const diagnostics = [];
  const parsed = productSchema.safeParse(product);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      diagnostics.push({
        ruleId: 'ZOD',
        severity: 'error',
        jsonPointer: pointer(issue.path),
        message: issue.message,
      });
    }
  }
  for (const finding of checkProductJson(label, product)) {
    diagnostics.push({
      ruleId: finding.id,
      severity: finding.severity === 'block' ? 'error' : finding.severity,
      jsonPointer: '',
      message: finding.message,
    });
  }
  diagnostics.sort((a, b) =>
    a.ruleId === b.ruleId
      ? a.jsonPointer.localeCompare(b.jsonPointer) || a.message.localeCompare(b.message)
      : a.ruleId.localeCompare(b.ruleId),
  );
  return {
    contractId: CONTRACT_ID,
    // **valid は「Zod を通った」だけ**。品質フロアの warn は valid に影響しない
    // ——既存 CI の意味（warn は exit に影響しない）を変えないため。
    // 自動提案を通すかどうかは呼び手が決める（MiocaOS は diagnostics 0 件を要求する）。
    valid: parsed.success,
    diagnostics,
    normalizedProductSha256: sha256(canonical(product)),
  };
}

function main(argv) {
  const at = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : '';
  };
  const input = at('--input');
  if (!input) {
    process.stderr.write('usage: validate-product-content.mjs --input <file> [--format json]\n');
    return 2;
  }
  let product;
  try {
    product = JSON.parse(fs.readFileSync(input, 'utf8'));
  } catch (err) {
    process.stdout.write(
      JSON.stringify({
        contractId: CONTRACT_ID,
        valid: false,
        diagnostics: [{ ruleId: 'C1', severity: 'error', jsonPointer: '',
                        message: `${input}: JSON parse 失敗（${err.message}）` }],
        normalizedProductSha256: '',
      }) + '\n',
    );
    return 1;
  }
  const report = inspect(product, path.basename(input));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  return report.valid && report.diagnostics.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exit(main(process.argv.slice(2)));
}
