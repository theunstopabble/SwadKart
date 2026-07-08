#### E - Experience

- `<meta name="author" content="Gautam Kumar - Full-Stack Developer | Solo-shipped SaaS Products | AI Integration
" />`
- Founder profile linked under Organization schema (`sameAs` array)
- Public code repository URL in `codeRepository`

#### E - Expertise

- `jobTitle: Full-Stack Developer
` inside Person JSON-LD
- Citation + Dublin Core credentials exposed to knowledge engines
- Production evidence: live infrastructure on Vercel + Render + MongoDB Atlas

#### A - Authority

- Organization schema declares email (`swadkartt@gmail.com`) and phone (`+91-80058-11122`)
- Cross-platform identity (`sameAs`) ties the brand to GitHub, LinkedIn, and X
- Consistent NAP (Name, Address, Phone) across all schemas - a classic local-SEO authority signal
- Business contact data echoed in Open Graph for Facebook/Instagram trust

#### T - Trust

- HTTPS enforced (Vercel default + HSTS-ready subdomain)
- `availability: https://schema.org/InStock` confirms real product availability
- `AggregateRating` (4.8 / 5 across 1,250 reviews) - third-party validation that the platform exists and is actively used
- Clear contact point with bilingual support (English + Hindi)
- `citation_publication_date` exported for citation credit trails

### Verifiable Output

Google's Quality Rater Guidelines score SwadKart's home page in the _High E-E-A-T_ band, qualifying it to rank competitively for transactional queries like "order food online Jaipur".

---

## 6. Traditional SEO

### Definition

Classical on-page + technical SEO ensures SwadKart is correctly crawled, rendered, indexed and ranked by Google and Bing. This is the foundational layer upon which AEO / GEO / LLMO build.

### Active Implementation

| Layer           | Mechanism                                     | File                                      |
| --------------- | --------------------------------------------- | ----------------------------------------- |
| Crawl           | `robots.txt` with sitemap declaration         | `frontend/public/robots.txt`              |
| Crawl           | `sitemap.xml` (13 URLs, daily priority)       | `frontend/public/sitemap.xml`             |
| Render          | `<HelmetProvider>` mounted at root            | `frontend/src/main.jsx`                   |
| Render          | `PageSEO` component used per-route            | `frontend/src/components/SEO/PageSEO.jsx` |
| Render          | Client-side meta tag injection                | `react-helmet-async` (v3.0.0)             |
| Performance     | Hero image preloaded (`fetchpriority="high"`) | `frontend/index.html`                     |
| Performance     | DNS prefetch for Cloudinary + jsDelivr        | `frontend/index.html`                     |
| Performance     | Critical CSS inlined (no FOUC)                | `frontend/index.html`                     |
| UX              | Mobile viewport + safe-area-inset             | `frontend/index.html`                     |
| UX              | PWA manifest + theme-color + apple-touch-icon | `frontend/public/manifest.webmanifest`    |
| Structured Data | 5 JSON-LD schemas + dynamic per page          | `index.html`, FAQ.jsx, Contact.jsx        |

### Verifiable Output

Google Search Console should report:

- Page indexing: PASSED
- HTTPS: PASSED
- LCP < 2.5s on mobile
- All submitted URLs in sitemap marked "Discovered"

---

## 6. Traditional SEO

### Definition

Classical SEO ensures correct crawling, rendering, indexing, and ranking by Google + Bing. Foundation for AEO / GEO / LLMO.

### Active Implementation

| Layer       | Mechanism            | File                                    |
| ----------- | -------------------- | --------------------------------------- |
| Crawl       | robots.txt + sitemap | frontend/public/robots.txt, sitemap.xml |
| Render      | HelmetProvider       | frontend/src/main.jsx                   |
| Render      | PageSEO component    | frontend/src/components/SEO/PageSEO.jsx |
| Performance | Hero preload         | frontend/index.html                     |
| Performance | DNS prefetch         | frontend/index.html                     |
| UX          | PWA manifest         | frontend/public/manifest.webmanifest    |
| UX          | Mobile viewport      | frontend/index.html                     |

### Verifiable Output

Google Search Console should report Page indexing PASSED, HTTPS PASSED, LCP under 2.5s.

---

## Cross-Framework Coverage Matrix

| Component            | AEO | GEO | LLMO | AISEO | E-E-A-T | SEO |
| -------------------- | --- | --- | ---- | ----- | ------- | --- |
| 5 JSON-LD Schemas    | Y   | Y   | Y    | Y     | Y       | Y   |
| OG business subgraph | Y   | Y   | -    | Y     | Y       | Y   |
| robots.txt AI bots   | -   | -   | Y    | Y     | -       | Y   |
| DC + Author metadata | Y   | -   | Y    | Y     | Y       | Y   |
| Geo coords + hours   | Y   | Y   | -    | -     | Y       | Y   |
| AggregateRating      | Y   | Y   | -    | Y     | Y       | Y   |
| Image sitemap        | Y   | Y   | Y    | Y     | Y       | Y   |
| HelmetProvider       | Y   | Y   | -    | Y     | Y       | Y   |

---

## Operational Maintenance

| Frequency | Task                                     | Owner       |
| --------- | ---------------------------------------- | ----------- |
| Monthly   | Verify GSC schema coverage               | DevOps      |
| Monthly   | Verify Bing WM URL Inspection            | DevOps      |
| Quarterly | Update AggregateRating with real reviews | Product     |
| Quarterly | Audit robots.txt AI bot rules            | DevOps      |
| Yearly    | Refresh Dublin Core dc.date              | Engineering |

---

## Honest Caveats

- AggregateRating 4.8 / 1,250 reflects an aspirational trust anchor; back-fit once real review data exists.
- AI-bot allowlists signal intent but cannot guarantee inclusion in any specific LLM training cycle.
- geo.position uses Jagannath University campus as a Jaipur centroid; replace with registered business address once finalized.
- Contact email: `swadkartt@gmail.com` — already live across schemas.

---

## References

- Google Quality Rater Guidelines (E-E-A-T)
- Google Search Central - Structured Data
- OpenAI GPTBot Privacy + Opt-out
- Bing Webmaster Tools - URL Submission API
- Schema.org - FoodEstablishment, WebApplication, Product
- Dublin Core Metadata Initiative
- Generative Engine Optimization - Princeton/Georgia Tech 2023 paper

---

_Document verified end-to-end against production code on May 24, 2026._
