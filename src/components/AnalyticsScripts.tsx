/**
 * AnalyticsScripts — renders GA4, GTM, and custom scripts as real <script>
 * tags in the server-rendered HTML (not via next/script which only injects
 * client-side and is invisible to Google's tag detection tools).
 *
 * Must be placed inside <head> in layout.tsx.
 */

interface ParsedScript {
  src?: string;
  async?: boolean;
  content?: string;
}

/**
 * Parses raw HTML containing <script> tags (e.g. pasted from Google Analytics
 * setup instructions) into an array of structured script descriptors.
 * Ignores HTML comments and non-script content.
 */
function parseScriptTags(html: string): ParsedScript[] {
  const results: ParsedScript[] = [];
  // Match both <script ...>content</script> and self-closing <script ... />
  const tagRe = /<script([^>]*)>([\s\S]*?)<\/script>|<script([^>]*?)\/>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const attrs = m[1] ?? m[3] ?? '';
    const body  = m[2] ?? '';
    const srcM  = attrs.match(/src=["']([^"']+)["']/i);
    const src   = srcM ? srcM[1] : undefined;
    const isAsync = /\basync\b/i.test(attrs);
    const content = body.trim();
    if (src || content) {
      results.push({ src, async: isAsync, content: content || undefined });
    }
  }
  return results;
}

interface AnalyticsScriptsProps {
  gaId: string;
  gtmId: string;
  customScripts: string;
}

export function AnalyticsScripts({ gaId, gtmId, customScripts }: AnalyticsScriptsProps) {
  const gaInit = gaId
    ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`
    : '';

  const gtmInit = gtmId
    ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
    : '';

  const customParsed = customScripts ? parseScriptTags(customScripts) : [];

  return (
    <>
      {/* ── Google Analytics 4 ── */}
      {gaId && (
        <>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script
            id="ga4-init"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: gaInit }}
          />
        </>
      )}

      {/* ── Google Tag Manager ── */}
      {gtmId && (
        <script
          id="gtm-init"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: gtmInit }}
        />
      )}

      {/* ── Custom head scripts (supports pasted raw HTML <script> blocks) ── */}
      {customParsed.map((s, i) =>
        s.src ? (
          // External script (e.g. <script async src="..."></script>)
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script key={`custom-src-${i}`} src={s.src} async={s.async ?? false} />
        ) : (
          // Inline script
          <script
            key={`custom-inline-${i}`}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: s.content! }}
          />
        )
      )}
    </>
  );
}
