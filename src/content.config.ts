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

export const collections = { products, home, articles };
