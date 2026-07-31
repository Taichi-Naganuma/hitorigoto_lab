# デザインの不変条件（機械が勝手に変えてはいけない顔）— hitorigoto-lab 写し

> **これは読み取り専用の写し**。正本は my-portfolio `Trains/docs/design/DESIGN-INVARIANTS.md`
> （＋設計 `Trains/docs/design/planned/os-site-improvement-division-of-labor.md`）。食い違ったら正本が正。
> **機械（自走OS）は本ファイルを書き換えない**（憲法の改訂は人間が正本で行い、ここへ写す）。
>
> **用途**: 自走OS のサイト改善「分業」で、自動実装レーン（Node）の実装セッションが「触ってよい面／
> 触れてはいけない顔」を照合するための、リポ内の憲法。違反する変更を要すると判明したら**実装せず終了**する。

---

## 1. ブランド憲法（顔の条項・機械は起案も不可）— Mananect Brand System v1（2026-08-01 確定）

**色は意味。3軸が会社の思想（AOS ループ）に対応する。** Convince/Operate/Verify。

- **1-1 Light = Convince（地・Reasoning）**: 理解・説得・学習の面は**全面ライト（温ペーパー）**。面: mananect.com・製品マーケLP・docs・ブログ・構想。深夜×ネオンのハイプ見た目は詐欺パターンとして棄却。
- **1-2 Dark = Operate（地・Execution）**: 実行・監視・証跡の面は**ダーク（温 near-black）**。面: 製品アプリ・診断コンソール・Mioca cockpit・live。**ダークは"作業/証跡"の面に限る**（マーケ/読み物をダークにしない）。
- **1-3 Gold = Verify（印・Evidence・多色化しない）**: 信頼・署名・証明は**証跡ゴールド `#a8781e`（on light）/`#dda843`（on dark）**の印で担保。**Gold は"地"にしない・面積<8%**。Light 面のアクセント/CTA/リンク＝金。青・緑・紫をブランド色に足さない。
- **1-3b Rust = Unverified（印・金の対）**: 「まだ証明できていない」は **Rust `#a9552f`／ダーク`#c6633c`** で正直に示す。金＝証明済み／錆＝未証明で、正直な台帳になる。
- **1-4 地と印の法則**: Light/Dark は排他的な"地"（面の役割で決まる）。Gold は"地"にならない"印"で、両方を縫って1社に見せる。**唯一許す混在＝ライト説得ページ内のダーク Operate 帯**（人の説明の中で機械が動く証拠）。書体: ゴシック＝人の声（Convince）／モノスペース＝機械の声（Operate/Verify）。

### トークン確定値（一次値の真実源は `src/styles/tokens.css`）
| 軸 | トークン | 確定値 | 備考 |
|---|---|---|---|
| Verify | アクセント/金 | `#a8781e`（`--accent`=`--gold`）／dark `#dda843` | 印・面積<8%・多色化しない（§1-3） |
| Unverified | 錆 | `#a9552f`（`--rust`）／dark `#c6633c` | 未証明の印（§1-3b） |
| Convince | Light 地 | bg `#f5f2ea`・ink `#1b1913`・line `#ded9c9` | 温ペーパー（§1-1） |
| Operate | Dark 地 | `--d-bg#100f09`・`--d-tx#ece7d8`・`--d-bd#332e1d` | 温 near-black・作業/証跡面のみ（§1-2） |
| — | セマンティック | success `#12805c`／warning `#dc6803`／danger `#d0392b` | 機能色 |
| — | 見出し | `--round-face`（ゴシック＝人の声） | §1-4 |

> 一次値は `src/styles/tokens.css` の `:root`（唯一の真実源）。本表は憲法としての写し。憲章 v1 の全文＝Convince/Operate/Verify に従う。

## 2. 機械が触れる面／触れない面（権限の明文）

### 機械が変えてよい（起案可・ゲート付き適用・レーンが編集してよい面）
- **コンテンツ・データ** = `src/content/**`（`os`／`os_pages`／`home`／`articles` の JSON。機械が draft で編集する唯一のコンテンツ面）。
- **デザイントークンの値** = `src/styles/tokens.css` の**既存キーの値**（憲法＝§1 の色数/ライト統一/誠実非主役を侵さない範囲での強弱・間隔・timing・テーマ差し替え）。

### 機械が変えてはいけない（起案も不可・レーンは触ったら実装中止＝exit）
- **§1 のブランド憲法そのもの**（色数／全面ライト統一／誠実非主役／OS 連想グリッド／角丸・ホバー境界線）。
- **コンポーネント craft**: `*.astro`／`src/components/**`／`src/layouts/**`／`src/styles/site-fx.css`／
  `src/styles/global.css`／`astro.config.*`（新コンポーネント・CSS アーキテクチャ・レイアウト/構成＝人間層）。
- **`tokens.css` のキーの増減**（新変数の導入・削除＝構成＝人間）。値の変更のみ可。
- **承認ゲート・安全モデル**（`auto_approve` の自己付与は禁止＝生成・適用の両層で強制 false）。
- **計測配線**（`content_ledger`／funnel／`/l/` 短縮パス／`utm_content=decision_id` の帰属キー）。
- **`LP_SITE_PATH`**（描画先 override。未設定だと別サイトへ化ける既知事故の恒久回避ガード）。

### 改訂クラス × 適用ゲート
| 改訂クラス | 機械の権限 | 適用ゲート |
|---|---|---|
| コピー/コンテンツ・データ | 起案＋変種生成 | draft → 承認（却下=非公開） |
| トークン範囲内の値 | 起案（提案 diff） | 提案 → オーナー承認 → PR マージ（`design_version+1`） |
| 新セクション/構成変更・コンポーネント craft | **起案も不可（人間層）** | 人間（私）が実装 |
| ブランド憲法そのもの（§1） | **起案も不可** | 人間が正本を直接改訂 |

## 3. 手続き
- 本ファイル（写し）の改訂は**人間が正本を直接改訂 → ここへ写す**。機械は書けない。
- 変更 PR はオーナーの明示承認なしにマージしない（`INVARIANTS.md` と同じ掟）。**auto-merge しない**。

## 4. 品質フロア（トップ/os 同等以上を「床」にする・受入基準）— 写し

> 正本は my-portfolio `Trains/docs/design/DESIGN-INVARIANTS.md §4`＋設計
> `Trains/docs/design/planned/quality-floor-standard-design.md §3`（床の一次定義）。食い違ったら正本が正。

§1 が「壊してはいけない顔」、§2 が「誰が何を触れてよいか」であるのに対し、本章は
**トップ（`HomeLanding`）＋os（`OsLanding`/`OsSubPage`）＋現行 `ProductPage` の品質を、新規着地の「床」とする**受入基準。
**build 緑は床の合否ではない**（空 FAQ・薄い deliver・プレースホルダ Stripe・多色化 token でも astro build は緑になる）。

- **4-1 単一の床・二面適用**: 床は 1 つ。craft（人間の新規ページ）も機械（`src/content/**`＋`src/styles/tokens.css` 値）も
  **同一基準**で効く。本章は機械の権限を増やさない（触れる面は §2 のまま）。
- **4-2 機械可検査ゲート**: `scripts/quality-floor-check.mjs`。CI（`astro-build.yml`）と Node 実装レーンの第三段で走る。
  **既定 warn-only**（`QUALITY_FLOOR_ENFORCE=0`＝挙動ゼロ差）、オーナー点火で block。**block の歯は機械が触る面**
  （token 整合＝accent 単色/全面ライト/キー不増減、content 完全性＝必須スキーマ/プレースホルダ）**に集約**。生 hex 直書き等の
  craft ヒントは warn（機械は `*.astro` を触らない）。
- **4-3 助言 LLM（`QUALITY_FLOOR_JUDGE`）は非ブロッキング**: スコアで自動マージしない（`auto_approve` 強制 false を侵さない）。
- **4-4 改訂は人間が正本を直接改訂 → ここへ写す**（機械は書けない）。
- **4-5 craft の Definition of Done（新商品の器）**: `ProductPage` 経由・fx 署名（`.fx-rise`/`.fx-ring`/グラデラベル）継承・
  セクション網羅（hero/buy/deliver/steps/target/faq/ai-note/backlink）・`content/products/<locale>/<slug>.json` が必須スキーマ＋
  最小 richness・生色ハードコード回避＋`@media` レスポンシブ/reduced-motion・`npm run build` 緑＋`npm run quality-floor` 緑・
  帰属（`/l/`・`utm_content`・`StripeAttribution`）非破壊。
