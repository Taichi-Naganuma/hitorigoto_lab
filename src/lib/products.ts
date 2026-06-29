import { getCollection, getEntry } from 'astro:content';
import type { Locale } from '../i18n/ui';

// Glob-loader entry id is the file path, e.g. "en/ai-deck-studio".
// The URL slug is its basename — shared across locales, which is what pairs
// hreflang alternates. (Do NOT add a `slug` field to the data: the glob loader
// treats it as the entry id, which collides across locales.)
export function productSlug(id: string) {
  return id.split('/').pop()!;
}

export async function getProductsByLocale(locale: Locale) {
  return getCollection('products', (e) => e.data.locale === locale && !e.data.draft);
}

// getStaticPaths helper: { params: { slug }, props: { product } } per locale.
export async function getProductPaths(locale: Locale) {
  const products = await getProductsByLocale(locale);
  return products.map((product) => ({
    params: { slug: productSlug(product.id) },
    props: { product },
  }));
}

export async function getHome(locale: Locale) {
  const home = await getEntry('home', locale);
  if (!home) throw new Error(`Missing home content for locale: ${locale}`);
  return home;
}
