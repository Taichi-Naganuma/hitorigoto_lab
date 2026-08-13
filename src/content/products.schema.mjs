// products.schema.mjs — products コレクションの Zod schema（唯一の定義元）。
//
// なぜ content.config.ts から切り出したか:
// この schema は「壊れた JSON を astro build が落とす」第二段ゲートだが、**生成する側**
// （MiocaOS）が PR を出す前に同じ検査を掛けられないと、CI が最初の検査になってしまう。
// content.config.ts は `astro:content` という仮想モジュールを import するので素の Node
// からは読めない（ERR_UNSUPPORTED_ESM_URL_SCHEME）。そこで schema だけをここへ移し、
// content.config.ts はこれを読む——**定義は1つのまま**で、CLI からも読める形にする。
//
// import は `zod` ではなく **`astro/zod`**。実測すると astro は自前の zod 3.25.76 を
// node_modules/astro/node_modules/zod に抱えており、巻き上げられた zod は 4.4.3 だった。
// 素の `zod` を読むと、CLI と `astro build` が**別の zod で検査する**ことになる
// ——「生成時は通るが CI で意味が変わる」の典型。`astro/zod` は astro が検査に使う
// その物なので、版のずれが構造的に起こらない。
//
// **schema の意味は1文字も変えていない**（切り出しただけ）。
import { z } from 'astro/zod';

// 決済リンク（checkout）の第二段ゲート＝Stripe(buy.stripe.com) か Lemon Squeezy(*.lemonsqueezy.com) の
// ホスト済み checkout URL のみ許可（多provider化・CK-6）。現行 stripeLink は buy.stripe.com ゆえ従来どおり通る。
export const payLinkSchema = z
  .string()
  .url()
  .refine(
    (u) =>
      /^https:\/\/buy\.stripe\.com\//.test(u) ||
      /^https:\/\/[a-z0-9-]+\.lemonsqueezy\.com\//.test(u),
    { message: 'checkout URL は buy.stripe.com または *.lemonsqueezy.com である必要があります' },
  );

export const productSchema = z.object({
  locale: z.enum(['ja', 'en']),
  title: z.string(), // <title>
  description: z.string(), // meta description
  ogTitle: z.string().optional(), // og:title (falls back to title)
  ogDescription: z.string().optional(), // og:description (falls back to description)
  name: z.string().optional(), // 商品名（設計室シリーズ）— hero eyebrow / 導線ラベル用（無ければ card.title から導出）
  headline: z.string(), // h1 (AB target, 第五段) — inline <br>/<b> allowed
  lead: z.string(), // hero paragraph — inline <b> allowed
  price: z.number().int().positive(),
  currency: z.enum(['JPY', 'USD']),
  priceDisplay: z.string(), // main amount, e.g. "¥1,480" / "$29"
  priceNote: z.string().optional(), // small note, e.g. "（税込）" / "(USD)"
  cta: z.string(), // button label (AB target)
  ctaNote: z.string(),
  stripeLink: payLinkSchema, // gate（Stripe or Lemon Squeezy・名は歴史的に stripeLink）
  payProvider: z.enum(['stripe', 'lemonsqueezy']).optional(), // 決済provider（省略時は URL ホストで判別）
  // 任意の第2プラン（例: mioca=フルドラフト＋数字診断を1ページに）。単一プラン商品は両方省略＝価格ボックス1つ（従来どおり）。
  planLabel: z.string().optional(), // 複数プラン時に主プライスの上に出すラベル
  plan2: z
    .object({
      label: z.string(),
      price: z.number().int().positive(),
      priceDisplay: z.string(),
      priceNote: z.string().optional(),
      cta: z.string(),
      ctaNote: z.string(),
      stripeLink: payLinkSchema, // gate（Stripe or Lemon Squeezy）
    })
    .optional(),
  card: z.object({
    title: z.string(),
    blurb: z.string(),
    cta: z.string(),
    price: z.string(),
  }),
  deliver: z.array(z.object({ title: z.string(), body: z.string() })),
  steps: z.array(z.string()),
  target: z.array(z.string()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  aiNote: z.string(),
  draft: z.boolean().default(false),
});
