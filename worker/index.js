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
      const [, source, decisionId = ""] = m;
      if (UTM_SOURCES.has(source) && (!decisionId || SAFE_SEGMENT.test(decisionId))) {
        return interstitial(buildTarget(url, source, decisionId));
      }
    }
    return env.ASSETS.fetch(request);
  },
};
