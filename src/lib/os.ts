import { getCollection } from 'astro:content';
import type { Locale } from '../i18n/ui';

// os_pages を locale+slug で引く（glob の id 形式に依存しない堅牢版）。
export async function getOsPage(locale: Locale, slug: 'features' | 'how' | 'pricing') {
  const all = await getCollection('osPages');
  const entry = all.find((e) => e.data.locale === locale && e.data.page === slug);
  if (!entry) throw new Error(`Missing os_pages content: ${locale}/${slug}`);
  return entry.data;
}

// 自走OS「Mioca」サブサイト共通の設定。LP・専用ページ・ナビで共有する単一の真実源。
export const WAITLIST_URLS: Record<Locale, string> = {
  ja: 'https://tally.so/r/VLAPeM',
  en: 'https://tally.so/r/XxkopY',
};

export const OS_BRAND = 'Mioca';

export const osStatus = (l: Locale) => (l === 'ja' ? '準備中' : 'Coming soon');
export const osCta = (l: Locale) => (l === 'ja' ? '先行登録する' : 'Join the waitlist');

// ナビ項目。features/how/pricing は専用ページ、faq は LP のアンカー。
export interface OsNavItem { slug: string; label: string; anchor?: boolean }
export const osNav = (l: Locale): OsNavItem[] =>
  l === 'ja'
    ? [
        { slug: 'features', label: '機能' },
        { slug: 'how', label: 'しくみ' },
        { slug: 'pricing', label: '料金' },
        { slug: 'faq', label: 'よくある質問', anchor: true },
      ]
    : [
        { slug: 'features', label: 'Features' },
        { slug: 'how', label: 'How' },
        { slug: 'pricing', label: 'Pricing' },
        { slug: 'faq', label: 'FAQ', anchor: true },
      ];
