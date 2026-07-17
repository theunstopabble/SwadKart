// SwadKart SEO Constants — Central source of truth for AEO, GEO, LLMO, AISEO & E-E-A-T
export const SITE = {
  name: "SwadKart",
  tagline: "Taste Delivered",
  url: "https://swadkart.vercel.app",
  backendUrl: "https://swadkart-5wtf.onrender.com",
  logo: "https://swadkart.vercel.app/logo.png",
  favicon: "https://swadkart.vercel.app/pwa-192x192.png",
  ogImage: "https://swadkart.vercel.app/hero.webp",
  locale: "en_IN",
  alternateLocales: ["hi_IN"],
  country: "IN",
  currency: "INR",
  foundingDate: "2025-01-01",
  phone: "+91-80058-11122",
  email: "support@swadkart.com",
  inboxEmail: "swadkartt@gmail.com",
  address: {
    street: "Jagannath University, Jaipur Campus",
    city: "Jaipur",
    region: "Rajasthan",
    postalCode: "303901",
    country: "IN",
  },
  geo: {
    latitude: "26.9124",
    longitude: "75.7873",
  },
  openingHours: [
    { dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "08:00", closes: "23:00" },
  ],
  sameAs: [
    "https://github.com/theunstopabble/swadkart",
    "https://www.linkedin.com/in/gautamkr62",
    "https://x.com/_unstopabble",
  ],
  author: {
    name: "Gautam Kumar",
    url: "https://gautam-kr.vercel.app",
    jobTitle: "Full-Stack Developer",
    sameAs: [
      "https://github.com/theunstopabble",
      "https://www.linkedin.com/in/gautamkr62",
      "https://gautam-kr.vercel.app",
    ],
  },
};

export const DEFAULT_META = {
  title: `${SITE.name} — ${SITE.tagline} | Order Food Online in Jaipur`,
  description:
    "Order delicious food online from top restaurants in Jaipur. SwadKart offers fast delivery, real-time order tracking, AI chatbot assistance, and secure Razorpay payments. Download our PWA app today!",
  keywords: [
    "food delivery app",
    "order food online jaipur",
    "online food ordering",
    "restaurant delivery",
    "fast food delivery",
    "AI food recommendations",
    "voice search food",
    "SwadKart",
  ].join(", "),
};

export const PAGE_PATHS = {
  home: "/",
  restaurants: "/restaurants",
  login: "/login",
  register: "/register",
  cart: "/cart",
  contact: "/contact",
  faq: "/faq",
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
  swadpass: "/swadpass",
};

export const AUTHOR_INFO = {
  name: "Gautam Kumar",
  origin: "Sitamarhi, Bihar, India",
  current: "Jaipur, Rajasthan, India",
  portfolio: "https://gautam-kr.vercel.app",
};
