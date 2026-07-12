export const ui = {
  ja: {
    'footer.legal': '特定商取引法に基づく表記',
    'footer.privacy': 'プライバシーポリシー',
    'footer.top': 'トップへ',
    'footer.contact': 'お問い合わせ',
    'footer.copyright': '© 2026 ひとりごと研究所',
    'footer.sep': '｜',
    'nav.back': '← ひとりごと研究所 購買部',
    'lang.switch': 'English',
    'product.deliver': '届くもの',
    'product.steps': 'しくみ',
    'product.target': 'こんな人のために作りました',
    'product.faq': 'よくある質問',
  },
  en: {
    'footer.legal': 'Commercial disclosure',
    'footer.privacy': 'Privacy',
    'footer.top': 'Home',
    'footer.contact': 'Contact',
    'footer.copyright': '© 2026 Hitorigoto Lab',
    'footer.sep': '·',
    'nav.back': '← Hitorigoto Lab',
    'lang.switch': '日本語',
    'product.deliver': 'What you get',
    'product.steps': 'How it works',
    'product.target': "Who it's for",
    'product.faq': 'FAQ',
  },
} as const;

export type Locale = keyof typeof ui;
export type UIKey = keyof (typeof ui)['ja'];

export function useTranslations(locale: Locale) {
  return (key: UIKey): string => ui[locale][key] ?? ui.ja[key];
}
