import { SITE } from "./seoConstants";

/**
 * Generates a JSON-LD script tag object for injection via React Helmet.
 * All schemas follow Schema.org vocabulary for maximum AI/SEO compatibility.
 */
export const toJsonLd = (data) => ({
  type: "application/ld+json",
  innerHTML: JSON.stringify(data).replace(/</g, "\\u003c"),
});

/**
 * Organization schema — E-E-A-T signal for brand entity.
 */
export const organizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: SITE.logo,
  email: SITE.email,
  telephone: SITE.phone,
  sameAs: SITE.sameAs,
  foundingDate: SITE.foundingDate,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.region,
    postalCode: SITE.address.postalCode,
    addressCountry: SITE.address.country,
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: SITE.phone,
    contactType: "Customer Support",
    availableLanguage: ["English", "Hindi"],
    areaServed: "IN",
  },
});

/**
 * LocalBusiness / FoodEstablishment schema — boosts local SEO + map pack.
 */
export const localBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  name: `${SITE.name} — Online Food Delivery`,
  image: [SITE.logo, SITE.ogImage],
  url: SITE.url,
  telephone: SITE.phone,
  priceRange: "₹",
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.region,
    postalCode: SITE.address.postalCode,
    addressCountry: SITE.address.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: SITE.geo.latitude,
    longitude: SITE.geo.longitude,
  },
  openingHoursSpecification: SITE.openingHours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.dayOfWeek,
    opens: h.opens,
    closes: h.closes,
  })),
  servesCuisine: ["Indian", "Chinese", "Fast Food", "Street Food", "Desserts"],
  acceptsReservations: true,
  paymentAccepted: "Cash, UPI, Credit Card, Debit Card, Net Banking",
  currenciesAccepted: "INR",
  sameAs: SITE.sameAs,
});

/**
 * WebSite schema with SearchAction — enables AI search + Google sitelinks searchbox.
 */
export const websiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE.url}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  inLanguage: SITE.locale,
});

/**
 * WebApplication schema — already present in index.html; reusable version.
 */
export const webApplicationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE.url,
  description:
    "Production-grade multi-vendor food delivery platform with AI chatbot, voice search, biometric auth, real-time GPS tracking, Razorpay payments, gamification, and PWA support.",
  applicationCategory: "FoodEstablishment",
  operatingSystem: "Web, iOS, Android",
  author: {
    "@type": "Person",
    name: SITE.author.name,
    url: SITE.author.url,
    jobTitle: SITE.author.jobTitle,
    sameAs: SITE.author.sameAs,
  },
  creator: {
    "@type": "Person",
    name: SITE.author.name,
    url: SITE.author.url,
  },
  publisher: {
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: SITE.currency,
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: "0", currency: SITE.currency },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: "0", maxValue: "0", unitCode: "DAY" },
        transitTime: { "@type": "QuantitativeValue", minValue: "0", maxValue: "0", unitCode: "DAY" },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    },
  },
  softwareVersion: "1.0.2",
  codeRepository: "https://github.com/theunstopabble/swadkart",
  featureList: [
    "AI chatbot food recommendations",
    "Voice search in English and Hindi",
    "Real-time order GPS tracking",
    "Biometric authentication",
    "Razorpay payments",
    "Group ordering",
    "Table reservations",
    "SwadPass subscription",
  ],
});

/**
 * FAQPage / Q&A schema — core AEO signal for answer engines.
 */
export const faqPageSchema = (faqItems) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
});

/**
 * BreadcrumbList schema — helps AI engines understand navigation hierarchy.
 */
export const breadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url ? `${SITE.url}${item.url}` : undefined,
  })),
});

/**
 * Article / AboutPage schema for E-E-A-T and authority content.
 */
export const aboutPageSchema = ({ headline, description, datePublished, dateModified }) => ({
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: headline,
  headline,
  description,
  url: `${SITE.url}/about`,
  image: SITE.ogImage,
  datePublished,
  dateModified,
  author: {
    "@type": "Person",
    name: SITE.author.name,
    url: SITE.author.url,
    jobTitle: SITE.author.jobTitle,
    sameAs: SITE.author.sameAs,
  },
  publisher: {
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
  },
  mainEntity: {
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    sameAs: SITE.sameAs,
  },
});

/**
 * ContactPage schema.
 */
export const contactPageSchema = () => ({
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact SwadKart Support",
  url: `${SITE.url}/contact`,
  mainEntity: {
    "@type": "Organization",
    name: SITE.name,
    telephone: SITE.phone,
    email: SITE.email,
    url: SITE.url,
  },
});

/**
 * Product / Offer schema generator for menu items (GEO/LLMO entity signal).
 */
export const menuItemSchema = ({ name, description, image, price, currency = "INR", category, restaurantName }) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name,
  description,
  image: image || SITE.ogImage,
  brand: {
    "@type": "Brand",
    name: restaurantName || SITE.name,
  },
  category,
  offers: {
    "@type": "Offer",
    price,
    priceCurrency: currency,
    availability: "https://schema.org/InStock",
    seller: {
      "@type": "FoodEstablishment",
      name: restaurantName || SITE.name,
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: "0", currency },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: "0", maxValue: "1", unitCode: "DAY" },
        transitTime: { "@type": "QuantitativeValue", minValue: "0", maxValue: "1", unitCode: "DAY" },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    },
  },
});

/**
 * AggregateRating schema helper for E-E-A-T trust signals.
 */
export const aggregateRatingSchema = ({ ratingValue, reviewCount, itemName }) => ({
  "@context": "https://schema.org",
  "@type": "AggregateRating",
  itemReviewed: {
    "@type": "WebApplication",
    name: itemName || SITE.name,
    url: SITE.url,
  },
  ratingValue: String(ratingValue),
  bestRating: "5",
  worstRating: "1",
  reviewCount: String(reviewCount),
});
