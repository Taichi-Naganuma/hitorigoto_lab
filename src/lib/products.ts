import { getCollection, getEntry } from 'astro:content';
import type { Locale } from '../i18n/ui';

export async function getProductsByLocale(locale: Locale) {
  return getCollection('products', (e) => e.data.locale === locale && !e.data.draft);
}

// getStaticPaths helper: { params: { slug }, props: { product } } per locale.
export async function getProductPaths(locale: Locale) {
  const products = await getProductsByLocale(locale);
  return products.map((product) => ({
    params: { slug: product.data.slug },
    props: { product },
  }));
}

export async function getHome(locale: Locale) {
  const home = await getEntry('home', locale);
  if (!home) throw new Error(`Missing home content for locale: ${locale}`);
  return home;
}
