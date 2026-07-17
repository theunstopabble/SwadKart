import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, HelpCircle, Shield, Newspaper, Cookie } from "lucide-react";

const InfoPage = () => {
  const { type } = useParams();

  // 📝 DATA STORE: Theme consistent icons and text
  const contentData = {
    faq: {
      title: "Frequently Asked Questions",
      icon: <HelpCircle size={40} className="text-primary" />,
      text: "Got questions? We have answers!",
      questions: [
        {
          q: "How long does delivery take?",
          a: "Usually 30-45 minutes depending on your location.",
        },
        {
          q: "Can I cancel my order?",
          a: "Yes, you can cancel while your order status is 'Placed' or 'Preparing'. Once it moves to 'Ready' or 'Out for Delivery', cancellation is no longer available.",
        },
        {
          q: "Do you offer refunds?",
          a: "Refunds are processed for missing items or quality issues within 24 hours.",
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      icon: <FileText size={40} className="text-primary" />,
      text: "By using SwadKart, you agree to the following terms. We ensure fair usage and transparent policies for all our users.",
      details: [
        "✅ User must be 18+",
        "✅ Payments are secure",
        "✅ Abuse of platform leads to ban",
      ],
    },
    privacy: {
      title: "Privacy Policy",
      icon: <Shield size={40} className="text-primary" />,
      text: "Your data is safe with us. We do not sell your personal information to third parties. We only use your location for delivery purposes.",
      details: [
        "🔒 End-to-end encryption",
        "🔒 No data selling",
        "🔒 Secure payment gateways",
      ],
    },
    blog: {
      title: "SwadKart Blog",
      icon: <Newspaper size={40} className="text-primary" />,
      text: "Latest updates, features, and stories from the SwadKart platform.",
      sections: [
        {
          title: "🚀 SwadKart v1.0 — AI-Powered Food Delivery is Here",
          date: "Jan 2025",
          content:
            "SwadKart launched as a production-grade multi-vendor food delivery platform featuring a Groq LLM chatbot, voice search in English & Hindi, real-time GPS tracking via Socket.IO, biometric authentication with WebAuthn, and secure Razorpay payments. The platform supports 4 roles: Admin, Restaurant Owner, Delivery Partner, and Customer.",
        },
        {
          title: "🎯 SwadPass Subscription & Gamification",
          date: "Mar 2025",
          content:
            "Introduced SwadPass — a premium subscription tier with free delivery, exclusive discounts, and priority support. Also launched gamification features including daily streaks, SwadCoins rewards, achievement badges, and leaderboards to enhance user engagement and retention.",
        },
        {
          title: "🤖 AI Chatbot with Groq Llama 3.3",
          date: "Jun 2025",
          content:
            "Integrated Groq's Llama 3.3 LLM for intelligent food recommendations, order assistance, and natural language search. The chatbot understands context, remembers preferences, and provides personalized suggestions across 30+ API routes and 14 MongoDB models.",
        },
        {
          title: "🌐 PWA + Offline Support Deployed",
          date: "Sep 2025",
          content:
            "SwadKart became a fully installable Progressive Web App with Workbox service worker, offline support, push notifications, and background sync. Users can browse restaurants and view cached menus even without an internet connection.",
        },
      ],
    },
    cookie: {
      title: "Cookie Policy",
      icon: <Cookie size={40} className="text-primary" />,
      text: "SwadKart uses cookies and similar technologies to enhance your browsing experience, analyze traffic, and personalize content.",
      details: [
        "🍪 Essential Cookies: Required for authentication, session management, and secure checkout. These cannot be disabled.",
        "📊 Analytics Cookies: Help us understand how you use the platform to improve features and performance.",
        "🎯 Preference Cookies: Remember your language selection, location preferences, and theme settings.",
        "🔒 No Third-Party Tracking: We do not use cookies for advertising or sell your data to third parties.",
        "⚙️ Manage Cookies: You can control cookies through your browser settings at any time.",
      ],
    },
    help: {
      title: "Help Center",
      icon: <HelpCircle size={40} className="text-primary" />,
      text: "Need support? Our team is available 24/7.",
      details: [
        `📞 Call: ${import.meta.env.VITE_SUPPORT_PHONE || "+91 12345 67890"}`,
        `📧 Email: ${import.meta.env.VITE_SUPPORT_EMAIL || "support@swadkart.com"}`,
        "💬 Chat Support: Coming Soon",
      ],
    },
  };

  const data = contentData[type];

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center pt-20 font-sans">
        <div className="bg-gray-900 p-10 rounded-2xl border border-gray-800 shadow-2xl text-center">
          <h2 className="text-3xl font-extrabold text-primary uppercase italic tracking-tighter mb-4">
            404 - Page Not Found
          </h2>
          <Link
            to="/"
            className="text-gray-500 font-bold hover:text-white transition-all uppercase text-xs tracking-widest border-b border-gray-800 pb-1"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-all mb-10 w-fit font-bold uppercase text-[10px] tracking-widest group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />{" "}
          Back to Home
        </Link>

        {/* Header Section - Premium Gray-900 Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 mb-10 relative overflow-hidden shadow-2xl">
          {/* subtle glow effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="bg-black/50 p-5 rounded-2xl border border-gray-700 shadow-xl flex-shrink-0">
              {data.icon}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold uppercase italic tracking-tighter text-white">
                {data.title}
              </h1>
              <p className="text-gray-500 mt-2 text-sm font-bold uppercase tracking-widest">
                SwadKart Official Information
              </p>
            </div>
          </div>
        </div>

        {/* Content Section - Pure Dark Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl transition-all hover:border-gray-700">
          <p className="text-xl text-gray-300 leading-relaxed mb-10 border-l-4 border-primary pl-6 font-medium italic">
            {data.text}
          </p>

          {/* Specific Rendering Logic */}
          {data.details && (
            <ul className="space-y-4">
              {data.details.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-4 text-gray-400 bg-black/40 p-5 rounded-xl border border-gray-800 transition-all hover:border-gray-700 group"
                >
                  <span className="w-2 h-2 bg-primary rounded-full group-hover:scale-125 transition-transform"></span>
                  <span className="font-medium text-sm md:text-base">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {data.sections && (
            <div className="space-y-8">
              {data.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="bg-black/40 p-6 rounded-2xl border border-gray-800 hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-extrabold text-white text-lg">
                      {section.title}
                    </h3>
                    {section.date && (
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">
                        {section.date}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {data.questions && (
            <div className="space-y-6">
              {data.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-black/40 p-6 rounded-2xl border border-gray-800 hover:border-primary/20 transition-all"
                >
                  <h3 className="font-extrabold text-white text-lg mb-3 flex items-start gap-3">
                    <span className="text-primary italic">Q.</span> {q.q}
                  </h3>
                  <p className="text-gray-400 pl-8 leading-relaxed text-sm md:text-base">
                    {q.a}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info inside InfoPage */}
        <p className="text-center mt-12 text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em]">
          Last updated: Jan 2025 • SwadKart Technologies
        </p>
      </div>
    </div>
  );
};

export default InfoPage;
