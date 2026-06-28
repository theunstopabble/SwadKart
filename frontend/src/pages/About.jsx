import {
  Globe,
  Shield,
  Zap,
  Smartphone,
  Award,
  MapPin,
  Mail,
  Phone,
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
  organizationSchema,
  breadcrumbSchema,
} from "../utils/structuredData";

const stats = [
  { label: "Partner Restaurants", value: "150+" },
  { label: "Orders Delivered", value: "50K+" },
  { label: "Active Users", value: "25K+" },
  { label: "Cities Served", value: "1 (Jaipur)" },
];

const values = [
  {
    title: "AI-Powered Innovation",
    description:
      "Our Groq LLM chatbot and voice search technology make finding your favorite food faster and more intuitive than ever before.",
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
      "Built by students at Jagannath University, Jaipur, SwadKart is a community-first platform supporting local restaurants and delivery partners.",
    icon: Globe,
  },
];

const authorSameAs = [
  { icon: Github, label: "GitHub", url: "https://github.com/theunstopabble" },
  {
    icon: Linkedin,
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/gautamkr62",
  },
  { icon: Twitter, label: "Twitter / X", url: "https://x.com/_unstopabble" },
];

export default function About() {
  const aboutSchema = aboutPageSchema({
    headline: "About SwadKart — AI-Powered Food Delivery Platform",
    description:
      "Learn about SwadKart, Jaipur's premier AI-powered food delivery app. Built by Jagannath University students with cutting-edge technology.",
    datePublished: "2025-01-01",
    dateModified: "2026-06-18",
  });

  const orgSchema = organizationSchema();
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "About SwadKart", url: "/about" },
  ]);

  const jsonLdScripts = [
    toJsonLd(aboutSchema),
    toJsonLd(orgSchema),
    toJsonLd(breadcrumb),
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <PageSEO
        title="About SwadKart — AI-Powered Food Delivery in Jaipur"
        description="Discover SwadKart, Jaipur's cutting-edge food delivery platform built with AI, real-time tracking & secure payments. Learn about our mission, technology, and team."
        keywords="about SwadKart, food delivery Jaipur, AI food app, SwadKart company, Jagannath University project, multi-vendor food platform"
        canonicalPath="/about"
        jsonLdScripts={jsonLdScripts}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full mb-6 text-sm font-medium text-primary">
            <Award size={16} />
            Built at Jagannath University, Jaipur
          </div>
          <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter mb-6">
            About <span className="text-primary">SwadKart</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            SwadKart is a production-grade, AI-powered multi-vendor food
            delivery platform revolutionizing how Jaipur orders food. Built by
            passionate developers at
            <strong> Jagannath University, Jaipur</strong>, we combine
            cutting-edge AI technology with seamless user experience to deliver
            food faster, smarter, and safer.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-center hover:border-primary/30 transition-all duration-300"
            >
              <div className="text-3xl sm:text-4xl font-black text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Values */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-white/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              Our <span className="text-primary">Mission</span> & Values
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              We're not just delivering food — we're delivering innovation,
              trust, and community support with every order.
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

      {/* Author / Creator Section (E-E-A-T Core) */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              Meet the <span className="text-primary">Creator</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              SwadKart was designed, developed, and deployed by a passionate
              Full-Stack Developer | Solo-shipped 4 SaaS Products | AI Integration
              integration .
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary/5 via-white/5 to-primary/5 border border-primary/20 rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Author Image Placeholder */}
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
                  Full-Stack Developer | Solo-shipped 4 SaaS Products | AI Integration
                  integration
                </p>
                <p className="text-gray-400 leading-relaxed mb-6">
                  A final-year Computer Science student at Jagannath University,
                  Jaipur, with expertise in React, Node.js, AI/ML (Groq LLM),
                  and cloud-native infrastructure. SwadKart is his flagship
                  project, combining cutting-edge AI with practical food
                  delivery solutions for Indian consumers.
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {authorSameAs.map((link) => (
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

      {/* Contact Info (E-E-A-T Trust Signal) */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-white/5 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black italic tracking-tighter mb-4">
            Get in <span className="text-primary">Touch</span>
          </h2>
          <p className="text-gray-400 mb-8">
            Have questions, feedback, or partnership inquiries? We'd love to
            hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@swadkart.com"
              className="inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:border-primary/30 rounded-2xl px-6 py-4 transition-all duration-300"
            >
              <Mail size={24} className="text-primary" />
              <div className="text-left">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Email
                </div>
                <div className="font-semibold">{SITE.email}</div>
              </div>
            </a>
            <a
              href={`tel:${SITE.phone}`}
              className="inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:border-primary/30 rounded-2xl px-6 py-4 transition-all duration-300"
            >
              <Phone size={24} className="text-primary" />
              <div className="text-left">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Phone
                </div>
                <div className="font-semibold">{SITE.phone}</div>
              </div>
            </a>
            <div className="inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
              <MapPin size={24} className="text-primary" />
              <div className="text-left">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Address
                </div>
                <div className="font-semibold">
                  {SITE.address.street}, {SITE.address.city}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
