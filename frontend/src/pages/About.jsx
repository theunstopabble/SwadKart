import {
  Globe,
  Shield,
  Zap,
  Smartphone,
  Award,
  Mail,
  ExternalLink,
  Github,
  Linkedin,
  Twitter,
} from "lucide-react";
import PageSEO from "../components/SEO/PageSEO";
import { SITE } from "../utils/seoConstants";
import {
  toJsonLd,
  aboutPageSchema,
  breadcrumbSchema,
} from "../utils/structuredData";

const values = [
  {
    title: "AI-Powered Innovation",
    description:
      "Groq LLM chatbot and voice search technology make finding your favorite food faster and more intuitive than ever before.",
    icon: Zap,
  },
  {
    title: "Security First",
    description:
      "Biometric authentication via WebAuthn, JWT-secured sessions, and Razorpay encryption ensure your data and payments are always safe.",
    icon: Shield,
  },
  {
    title: "Lightning Fast Delivery",
    description:
      "Real-time GPS tracking via Socket.IO and dynamic ETA prediction ensure your food arrives hot, fresh, and on time.",
    icon: Smartphone,
  },
  {
    title: "Community Driven",
    description:
      "Built as a solo project by Gautam Kumar, SwadKart is a community-first platform supporting local restaurants and delivery partners.",
    icon: Globe,
  },
];

const socialLinks = [
  { icon: Github, label: "GitHub", url: "https://github.com/theunstopabble" },
  {
    icon: Linkedin,
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/gautamkr62",
  },
  { icon: Twitter, label: "Twitter / X", url: "https://x.com/_unstopabble" },
  {
    icon: Globe,
    label: "Portfolio",
    url: "https://gautam-kr.vercel.app",
  },
];

export default function About() {
  const aboutSchema = aboutPageSchema({
    headline: "About SwadKart — AI-Powered Food Delivery Platform",
    description:
      "Learn about SwadKart, an AI-powered food delivery platform built by Gautam Kumar. Features include Groq LLM chatbot, voice search, GPS tracking, and biometric authentication.",
    datePublished: "2025-01-01",
    dateModified: "2026-07-17",
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "About SwadKart", url: "/about" },
  ]);

  const jsonLdScripts = [
    toJsonLd(aboutSchema),
    toJsonLd(breadcrumb),
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <PageSEO
        title="About SwadKart — AI-Powered Food Delivery Platform"
        description="Discover SwadKart, an AI-powered food delivery platform with Groq LLM chatbot, voice search, real-time GPS tracking & secure payments. Built by Gautam Kumar."
        keywords="about SwadKart, food delivery Jaipur, AI food app, SwadKart project, Gautam Kumar, full-stack developer, Groq LLM chatbot"
        canonicalPath="/about"
        jsonLdScripts={jsonLdScripts}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full mb-6 text-sm font-medium text-primary">
            <Award size={16} />
            AI-Powered Multi-Vendor Platform
          </div>
          <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter mb-6">
            About <span className="text-primary">SwadKart</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            SwadKart is a production-grade, AI-powered multi-vendor food
            delivery platform featuring a Groq LLM chatbot, voice search in
            English & Hindi, real-time GPS tracking, biometric authentication,
            and secure Razorpay payments — all wrapped in a PWA with offline
            support.
          </p>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-white/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              Mission & <span className="text-primary">Values</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Combining cutting-edge AI with practical food delivery solutions
              for Indian consumers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-black/30 border border-white/10 rounded-3xl p-8 hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-primary/30">
                  <value.icon size={28} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              Meet the <span className="text-primary">Creator</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Designed, developed, and deployed by a solo full-stack developer
              with a passion for AI-powered products.
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary/5 via-white/5 to-primary/5 border border-primary/20 rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center ring-2 ring-primary/30 flex-shrink-0">
                <span className="text-4xl font-black text-primary italic">
                  GK
                </span>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl sm:text-3xl font-black mb-2">
                  Gautam Kumar
                </h3>
                <p className="text-primary font-semibold mb-4">
                  Full-Stack Developer | Solo-shipped SaaS Products | AI Integration
                </p>
                <p className="text-gray-400 leading-relaxed mb-6">
                  From Sitamarhi, Bihar — currently based in Jaipur, Rajasthan.
                  A B.Tech Computer Science student at Jagannath University,
                  Jaipur, with expertise in React, Node.js, AI/ML (Groq LLM),
                  and cloud-native infrastructure. SwadKart is his flagship
                  project, combining cutting-edge AI with practical food
                  delivery solutions for Indian consumers.
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-primary/20 border border-white/10 hover:border-primary/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                    >
                      <link.icon size={16} />
                      {link.label}
                      <ExternalLink size={12} className="text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-white/5 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black italic tracking-tighter mb-4">
            Get in <span className="text-primary">Touch</span>
          </h2>
          <p className="text-gray-400 mb-8">
            Have questions, feedback, or partnership inquiries?
          </p>
          <div className="flex justify-center">
            <a
              href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || "support@swadkart.com"}`}
              className="inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:border-primary/30 rounded-2xl px-8 py-5 transition-all duration-300 group"
            >
              <Mail size={24} className="text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Email
                </div>
                <div className="font-semibold group-hover:text-primary transition-colors">
                  support@swadkart.com
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
