import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// products: one JSON per product per locale at products/<locale>/<slug>.json
// The Zod schema doubles as the validation gate for AI-generated LPs (第二段):
// a malformed entry fails `astro build` loudly rather than shipping a broken page.
const products = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/products' }),
  schema: z.object({
    locale: z.enum(['ja', 'en']),
    title: z.string(), // <title>
    description: z.string(), // meta description
    ogTitle: z.string().optional(), // og:title (falls back to title)
    ogDescription: z.string().optional(), // og:description (falls back to description)
    headline: z.string(), // h1 (AB target, 第五段) — inline <br>/<b> allowed
    lead: z.string(), // hero paragraph — inline <b> allowed
    price: z.number().int().positive(),
    currency: z.enum(['JPY', 'USD']),
    priceDisplay: z.string(), // main amount, e.g. "¥1,480" / "$29"
    priceNote: z.string().optional(), // small note, e.g. "（税込）" / "(USD)"
    cta: z.string(), // button label (AB target)
    ctaNote: z.string(),
    stripeLink: z.string().url().startsWith('https://buy.stripe.com/'), // gate
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
  }),
});

const home = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/home' }),
  schema: z.object({
    locale: z.enum(['ja', 'en']),
    title: z.string(),
    description: z.string(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    logo: z.string(),
    headline: z.string(),
    lead: z.string(),
    productsTitle: z.string(),
    howTitle: z.string(),
    how: z.array(z.string()),
    about: z
      .object({ title: z.string(), heading: z.string(), body: z.string() })
      .optional(),
  }),
});

// os: 自走OS「Mioca」の準備中/先行登録(waitlist)LP。1ロケール1JSON（os/<locale>.json）。
// products と同じく Zod schema が第二段ゲート＝将来 AI が LP コピーを改訂しても、
// 壊れた JSON は astro build が落として公開候補にしない。まだ販売しない＝価格/決済フィールドは持たない（床・誠実）。
const os = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/os' }),
  schema: z.object({
    locale: z.enum(['ja', 'en']),
    title: z.string(), // <title>
    description: z.string(), // meta description
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    brand: z.string(), // "Mioca"
    eyebrow: z.string(), // hero の小見出しピル
    status: z.string(), // "準備中" / "Coming soon"（バッジ）
    headline: z.string(), // h1 — inline <br>/<b> allowed
    lead: z.string(),
    ctaPrimary: z.string(), // 先行登録ボタン
    ctaSecondary: z.string(), // アンカー（できることを見る）
    waitlistNote: z.string(), // 「まだ販売していない・決済導線なし」の正直表記（床）
    chips: z.array(z.string()), // ヒーロー下のトラスト・チップ（署名/決定論/介入）
    console: z.object({ // ヒーロー右の「自律実行ログ」＝動作イメージ（明示ラベル・数字は本番実データではない）
      title: z.string(),
      tag: z.string(), // "動作イメージ" ラベル（誠実＝ライブ実データと誤認させない）
      rows: z.array(z.object({ text: z.string(), time: z.string(), state: z.string().optional() })),
      foot: z.string(),
    }),
    capTitle: z.string(), // section eyebrow（FEATURES · 機能）
    capHeading: z.string(),
    capLead: z.string(),
    caps: z.array(z.object({ // 主役＝能力（試作 Features 準拠：icon＋番号は index 由来・個人/法人タグ）
      title: z.string(),
      body: z.string(),
      personal: z.string(), // 個人ユースケース
      corporate: z.string(), // 法人ユースケース
    })),
    howTitle: z.string(),
    how: z.array(z.string()), // 自走ループのステップ
    proofLabel: z.string(), // LIVE TELEMETRY · 無人運転の証拠
    proofTitle: z.string(),
    proof: z.object({
      heading: z.string(),
      body: z.string(),
      points: z.array(z.string()),
    }), // 誠実は table stakes＝控えめな担保（脚注階層）
    pricingTitle: z.string(),
    pricing: z.object({ plan: z.string(), price: z.string(), note: z.string() }), // price は「準備中」＝捏造数値を置かない
    faqTitle: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    closingTitle: z.string(),
    closingBody: z.string(),
  }),
});

// os_pages: 自走OS「Mioca」の専用ページ（機能/しくみ/料金）。os_pages/<locale>/<slug>.json。
// LP と同じ Zod ゲート。blocks は cards/steps/points/note を任意に持てる柔軟構造（各ページで使い分け）。
const osPages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/os_pages' }),
  schema: z.object({
    locale: z.enum(['ja', 'en']),
    page: z.enum(['features', 'how', 'pricing']), // glob loader は "slug"/"id" フィールドを id 扱いする→衝突回避で "page"
    title: z.string(),
    description: z.string(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    eyebrow: z.string(),
    heading: z.string(),
    lead: z.string(),
    blocks: z.array(z.object({
      label: z.string().optional(),
      heading: z.string().optional(),
      lead: z.string().optional(),
      cards: z.array(z.object({ title: z.string(), body: z.string(), tag: z.string().optional() })).optional(),
      steps: z.array(z.object({ title: z.string(), body: z.string() })).optional(),
      points: z.array(z.string()).optional(),
      note: z.string().optional(),
    })),
    ctaHeading: z.string(),
    ctaBody: z.string(),
  }),
});

// GEO 記事（buyer-intent の回答形コンテンツ）。geo-scout 列車の generate_article_post が
// src/content/articles/<slug>.md に draft:true で書く。schema は生成 md の front-matter に一致させる
// （不一致だと astro build が落ちる＝壊れた記事を公開候補にしない第二段ゲート）。
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().default('ガイド'),
    pubDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { products, home, os, osPages, articles };
