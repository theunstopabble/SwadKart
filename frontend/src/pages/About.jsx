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
  Briefcase,
  GraduationCap,
  Code,
  Cpu,
  Cloud,
  BookOpen,
  ExternalLink as LinkIcon,
  ChevronRight,
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

const experience = [
  {
    role: "Emerging Technologies Intern",
    company: "Microsoft Elevate x AICTE",
    period: "Jan 2026 – Feb 2026",
    description:
      "Built Satark-AI, a deepfake detection platform using Microsoft Azure, FastAPI, PyTorch, and SpeechBrain. Designed a 3-tier microservice architecture for real-time audio forensics.",
  },
  {
    role: "Frontend Web Development Intern",
    company: "Edunet Foundation (AICTE x IBM SkillsBuild)",
    period: "Aug 2025 – Sep 2025",
    description:
      "Engineered responsive UIs with 95+ Lighthouse score, optimized asset loading achieving 30% reduction in page load time.",
  },
  {
    role: "Full-Stack Web Development Intern",
    company: "YHills",
    period: "Mar 2024 – Jun 2024",
    description:
      "Developed a scalable MERN stack application with RESTful APIs and dynamic React components, improving user engagement by 25%.",
  },
];

const projects = [
  {
    name: "InterviewMinds",
    tagline: "AI-Powered Mock Interview Platform",
    tech: "Next.js, FastAPI, WebRTC, TensorFlow.js, LangGraph",
    url: "https://interviewminds.vercel.app",
  },
  {
    name: "SwadKart",
    tagline: "Hyper-Local Food Delivery PWA",
    tech: "React, Node.js, MongoDB, Socket.IO, Groq LLM",
    url: "https://swadkart.vercel.app",
  },
  {
    name: "Satark-AI",
    tagline: "Deepfake Detection & Voice Verification",
    tech: "FastAPI, PyTorch, Wav2Vec2, Cloudflare Workers",
    url: "https://satark-deepfake.vercel.app",
  },
  {
    name: "TexFolio",
    tagline: "Premium AI-Powered LaTeX Resume Builder",
    tech: "Next.js, BullMQ, LangGraph, Razorpay",
    url: "https://texfolio.vercel.app",
  },
];

const skillCategories = [
  {
    title: "Languages",
    skills: ["TypeScript", "JavaScript (ES6+)", "Python", "Java", "SQL"],
    icon: Code,
  },
  {
    title: "Frontend",
    skills: [
      "React 19",
      "Next.js 16",
      "Tailwind CSS",
      "Redux Toolkit",
      "Framer Motion",
    ],
    icon: BookOpen,
  },
  {
    title: "Backend",
    skills: [
      "Node.js 22",
      "Express 5",
      "FastAPI",
      "Socket.IO",
      "GraphQL",
    ],
    icon: Cpu,
  },
  {
    title: "AI / ML",
    skills: [
      "Groq (Llama 3.3)",
      "LangChain",
      "PyTorch",
      "TensorFlow.js",
      "Hugging Face",
    ],
    icon: Cloud,
  },
];

export default function About() {
  const aboutSchema = aboutPageSchema({
    headline: "About Gautam Kumar — Full-Stack Developer & Creator of SwadKart",
    description:
      "Learn about Gautam Kumar, a full-stack developer and the solo creator of SwadKart — an AI-powered food delivery platform built for Jaipur.",
    datePublished: "2025-01-01",
    dateModified: "2026-07-17",
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
  ]);

  const jsonLdScripts = [
    toJsonLd(aboutSchema),
    toJsonLd(breadcrumb),
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <PageSEO
        title="About — Gautam Kumar | Full-Stack Developer & Creator of SwadKart"
        description="Meet Gautam Kumar, the solo developer behind SwadKart. Full-stack developer, AI integration specialist, and builder of 4 production-grade SaaS products."
        keywords="Gautam Kumar, full-stack developer, SwadKart creator, AI developer, Jagannath University, solo developer, React, Node.js"
        canonicalPath="/about"
        jsonLdScripts={jsonLdScripts}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full mb-6 text-sm font-medium text-primary">
            <Award size={16} />
            Solo Developer — 4 SaaS Products
          </div>
          <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter mb-6">
            About <span className="text-primary">Gautam Kumar</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Full-Stack Developer, solo-shipped 4 production-grade SaaS products,
            and AI integration specialist. Currently pursuing B.Tech in Computer
            Science at <strong>Jagannath University, Jaipur</strong>.
          </p>
        </div>
      </section>

      {/* Creator Profile */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-primary/5 via-white/5 to-primary/5 border border-primary/20 rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center ring-2 ring-primary/30 flex-shrink-0">
                <span className="text-4xl font-black text-primary italic">
                  GK
                </span>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-black mb-2">
                  Gautam Kumar
                </h2>
                <p className="text-primary font-semibold mb-4">
                  Full-Stack Developer | Solo-shipped SaaS Products | AI Integration
                </p>
                <p className="text-gray-400 leading-relaxed mb-4">
                  From Sitamarhi, Bihar — currently based in Jaipur, Rajasthan.
                  Building production-grade software with cutting-edge AI,
                  focused on solving real-world problems through clean
                  architecture and modern tech stacks.
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

      {/* Education */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              <span className="text-primary">Education</span>
            </h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-primary/30 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-primary/30">
                <GraduationCap size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">
                  B.Tech in Computer Science
                </h3>
                <p className="text-primary font-medium mb-2">
                  Jagannath University, Jaipur
                </p>
                <p className="text-gray-400 text-sm">Jul 2023 – Expected Jul 2027</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              <span className="text-primary">Experience</span>
            </h2>
          </div>
          <div className="space-y-6">
            {experience.map((exp) => (
              <div
                key={exp.role}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-primary/30">
                    <Briefcase size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                      <h3 className="text-lg font-bold">{exp.role}</h3>
                      <span className="text-gray-500 text-sm">{exp.period}</span>
                    </div>
                    <p className="text-primary font-medium text-sm mb-3">
                      {exp.company}
                    </p>
                    <p className="text-gray-400 leading-relaxed text-sm">
                      {exp.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16 bg-white/5 border-y border-white/5 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              Skills & <span className="text-primary">Technologies</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {skillCategories.map((cat) => (
              <div
                key={cat.title}
                className="bg-black/30 border border-white/10 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center mb-4 ring-1 ring-primary/30">
                  <cat.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-bold mb-3 text-sm">{cat.title}</h3>
                <ul className="space-y-1.5">
                  {cat.skills.map((skill) => (
                    <li
                      key={skill}
                      className="text-gray-400 text-sm flex items-center gap-2"
                    >
                      <ChevronRight size={12} className="text-primary" />
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              <span className="text-primary">Projects</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              4 production-grade SaaS products, solo-shipped from concept to deployment.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <LinkIcon size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-gray-400 text-sm mb-4">{project.tagline}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech.split(", ").map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-1 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* SwadKart Mission & Values */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-white/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
              SwadKart <span className="text-primary">Mission</span> & Values
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Built as a flagship project to combine cutting-edge AI with
              practical food delivery solutions for Indian consumers.
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

      {/* Contact Info */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black italic tracking-tighter mb-4">
            Get in <span className="text-primary">Touch</span>
          </h2>
          <p className="text-gray-400 mb-8">
            Have questions, feedback, or collaboration inquiries?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <span className="inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
              <Mail size={24} className="text-primary" />
              <div className="text-left">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Email
                </div>
                <div className="font-semibold">{SITE.email}</div>
              </div>
            </span>
            <span className="inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
              <MapPin size={24} className="text-primary" />
              <div className="text-left">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Location
                </div>
                <div className="font-semibold">
                  Jaipur, Rajasthan, India
                </div>
              </div>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
