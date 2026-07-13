// Attribution interstitial for /l/<source>/<decision_id> (channel-attribution short paths).
//
// Why a worker page instead of a _redirects rule: Cloudflare Web Analytics (RUM) records
// requestPath only for pages where the beacon actually fires, and the beacon is injected
// into served HTML at the edge. A server-side 301/302 never renders HTML, so the /l/ path
// would never appear in analytics and attribution would be lost. This worker returns a
// minimal HTML page (beacon gets injected → pageload recorded with the /l/ path), then
// forwards the visitor to the landing page client-side.
//
// Contract (keep in sync with my-portfolio Trains/tools/analysis/utm.py):
//   path   = /l/<source>/<decision_id>   source ∈ UTM_SOURCES, decision_id optional
//   query  = forwarded to the target untouched (minus `to`); utm_source/utm_content are
//            backfilled from the path when absent
//   ?to=   = optional target override, same-origin locale paths only (/ja/… or /en/…)

const UTM_SOURCES = new Set([
  "coconala", "x", "threads", "linkedin", "chiebukuro", "reddit", "note", "email", "lp",
]);

// Destination short paths (/l/<dest>, no decision_id) — VD-5 funnel_destinations の short 実装。
// Contract (keep in sync with my-portfolio Trains/train-sample/app_workspace/data/funnel_destinations.json):
// 漫画/動画 CTA が公開物に刷り込む恒久パス。ここに無い dest は 404（偽の面を作らない＝
// mioca-waitlist はページ未実装のため未宣言）。値は固定表のみ＝open redirect にしない。
// "note" は attribution source と重複するが、decision_id 付き（/l/note/<id>）は source 帰属、
// 裸（/l/note）は dest（note プロフィール）と一意に振り分けられる。
const DEST_TARGETS = {
  deck: "/en/ai-deck-studio/",                    // funnel_destinations: theater=en
  mioca: "/ja/mioca-loan/",
  follow: "https://x.com/hitorigoto_john",
  note: "https://note.com/grand_daisy6450",
};
const DEFAULT_TARGET = "/ja/ai-deck-studio/";
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const SAFE_TARGET = /^\/(ja|en)\/[A-Za-z0-9._\-/]*$/;

function buildTarget(url, source, decisionId) {
  const params = new URLSearchParams(url.search);
  const to = params.get("to") || "";
  params.delete("to");
  if (!params.has("utm_source")) params.set("utm_source", source);
  if (decisionId && !params.has("utm_content")) params.set("utm_content", decisionId);
  const path = SAFE_TARGET.test(to) ? to : DEFAULT_TARGET;
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function interstitial(target) {
  // `target` is built exclusively from validated/URL-encoded parts, safe to embed.
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>移動中… | Hitorigoto Lab</title>
<style>body{font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}p{color:#555}</style>
</head>
<body>
<p>ページへ移動しています… <a href="${target}">自動で移動しない場合はこちら</a></p>
<script>
// Give the edge-injected analytics beacon time to fire before navigating.
addEventListener("load", function () {
  setTimeout(function () { location.replace(${JSON.stringify(target)}); }, 600);
});
</script>
<noscript><meta http-equiv="refresh" content="0;url=${target}"></noscript>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/l\/([^/]+)(?:\/([^/]+))?\/?$/);
    if (m) {
      const [, seg, decisionId = ""] = m;
      // 目的地 short（裸 /l/<dest>）を先に判定。decision_id 付きは従来どおり source 帰属。
      if (!decisionId && Object.prototype.hasOwnProperty.call(DEST_TARGETS, seg)) {
        const dest = DEST_TARGETS[seg];
        const params = new URLSearchParams(url.search);
        params.delete("to");
        if (dest.startsWith("/") && !params.has("utm_source")) params.set("utm_source", seg);
        const qs = params.toString();
        return interstitial(qs ? `${dest}${dest.includes("?") ? "&" : "?"}${qs}` : dest);
      }
      if (UTM_SOURCES.has(seg) && (!decisionId || SAFE_SEGMENT.test(decisionId))) {
        return interstitial(buildTarget(url, seg, decisionId));
      }
    }
    return env.ASSETS.fetch(request);
  },
};
