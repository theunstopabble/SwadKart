import { Helmet } from "react-helmet-async";
import { SITE } from "../../utils/seoConstants";

/**
 * PageSEO — Reusable SEO + AI Search Optimization wrapper.
 *
 * Covers:
 * - AEO: clear title/descriptions, answer-focused keywords
 * - GEO: entity-focused OG/Twitter metadata
 * - LLMO: structured JSON-LD injected per page
 * - AISEO: AI-readable meta + canonical + language alternates
 * - E-E-A-T: author, publisher, contact metadata
 */
export default function PageSEO({
  title,
  description,
  keywords = "",
  canonicalPath = "",
  ogImage = SITE.ogImage,
  ogType = "website",
  noindex = false,
  jsonLdScripts = [],
  children,
}) {
  const canonicalUrl = canonicalPath
    ? `${SITE.url}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`
    : SITE.url;
  const pageTitle = title
    ? `${title} | ${SITE.name}`
    : `${SITE.name} — ${SITE.tagline}`;

  return (
    <Helmet prioritizeSeoTags>
      {/* Basix indexing */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />}

      {/* AI / Answer engine signals */}
      <meta name="author" content={SITE.author.name} />
      <meta name="publisher" content={SITE.name} />
      <meta name="language" content={SITE.locale} />
      <meta httpEquiv="content-language" content={SITE.locale} />
      <meta name="geo.region" content={`${SITE.address.country}-${SITE.address.region}`} />
      <meta name="geo.placename" content={SITE.address.city} />
      <meta name="geo.position" content={`${SITE.geo.latitude};${SITE.geo.longitude}`} />
      <meta name="ICBM" content={`${SITE.geo.latitude}, ${SITE.geo.longitude}`} />

      {/* Open Graph — GEO entity graph */}
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={`${SITE.name} — ${description.slice(0, 80)}...`} />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="article:author" content={SITE.author.url} />
      <meta property="article:publisher" content={SITE.url} />

      {/* Twitter / X cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={description.slice(0, 80)} />
      <meta name="twitter:creator" content="@_unstopabble" />

      {/* Language alternates for i18n (AISEO) */}
      <link rel="alternate" hrefLang="en-in" href={canonicalUrl} />
      <link rel="alternate" hrefLang="hi-in" href={`${canonicalUrl}?lang=hi`} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* JSON-LD scripts */}
      {jsonLdScripts.map((script, idx) => (
        <script key={idx} type={script.type || "application/ld+json"}>
          {script.innerHTML}
        </script>
      ))}

      {children}
    </Helmet>
  );
}
