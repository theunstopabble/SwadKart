import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, HelpCircle, Shield, Cookie } from "lucide-react";
import { SITE } from "../utils/seoConstants";

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
          q: "How does SwadKart work?",
          a: "SwadKart is an AI-powered multi-vendor food delivery platform. Browse restaurants in Jaipur, add items to your cart, choose from secure payment methods (UPI, cards, net banking, COD), and track your order live on the map via GPS. Our Groq LLM chatbot helps you discover dishes through natural language or voice search in English and Hindi.",
        },
        {
          q: "How long does delivery take?",
          a: "Standard delivery takes 30-45 minutes within Jaipur city limits. Exact time depends on your location relative to the restaurant, traffic conditions, and order volume. You can track your delivery partner's real-time location on the map once your order is out for delivery.",
        },
        {
          q: "Can I cancel my order?",
          a: "Yes — cancellations are allowed while the order status is 'Placed' or 'Preparing'. Once the restaurant marks it as 'Ready' or the delivery partner picks it up ('Out for Delivery'), cancellation is no longer possible. To cancel, go to My Orders and tap the Cancel button if available.",
        },
        {
          q: "What is your refund and return policy?",
          a: "Refunds are processed within 24 hours for missing items, incorrect orders, or quality issues. Submit a support request with your order ID and photo evidence (if applicable). Refunds are credited back to your original payment method — UPI refunds are instant, card/net banking refunds take 3-5 business days.",
        },
        {
          q: "What payment methods are accepted?",
          a: "We accept UPI (GPay, PhonePe, Paytm), Credit/Debit Cards (Visa, Mastercard, RuPay), Net Banking (all major banks), and Cash on Delivery (COD). All online transactions are processed through Razorpay with industry-standard encryption. Your payment details are never stored on our servers.",
        },
        {
          q: "Does SwadKart have an AI chatbot?",
          a: "Yes — our chatbot is powered by Groq's Llama 3.3 LLM. It understands natural language queries like 'Show me biryani under ₹200', 'Best pizza near me', or 'What's good for a party of 4?'. The chatbot remembers your preferences across sessions and provides personalized restaurant and dish recommendations.",
        },
        {
          q: "Can I search for food using my voice?",
          a: "Absolutely. Tap the microphone icon in the search bar and speak your craving in English or Hindi. Voice search uses the Web Speech API and works in real-time — say 'mujhe pizza chahiye' or 'find me healthy options under ₹300' and the AI will match you instantly.",
        },
        {
          q: "How does real-time order tracking work?",
          a: "Once your order is accepted by the restaurant and a delivery partner is assigned, you can see their live GPS location on an interactive map. Tracking is powered by Socket.IO for real-time bidirectional communication — you see the exact ETA updated every few seconds as the driver moves.",
        },
        {
          q: "What is SwadPass and how do I get it?",
          a: "SwadPass is our premium subscription tier offering unlimited free delivery, an extra 10% discount on every order, priority customer support, and exclusive deals. You can subscribe monthly or yearly from the SwadPass page. SwadPass pays for itself in just 3-4 orders if you order frequently.",
        },
        {
          q: "What are SwadCoins and how do I earn them?",
          a: "SwadCoins are loyalty points earned on every order — typically 5% of your order value. They can be redeemed for discounts on future orders. You also earn bonus SwadCoins through daily streaks (ordering multiple days in a row), achievement badges, and referring friends to SwadKart.",
        },
        {
          q: "Does SwadKart support group ordering?",
          a: "Yes! Create a group order, share the invite link with friends or colleagues, and everyone can add their items to a shared cart. You can split the bill equally or item-wise. Group orders are perfect for office lunches, parties, or ordering together with roommates.",
        },
        {
          q: "Can I schedule a delivery in advance?",
          a: "Currently SwadKart supports on-demand ordering. Scheduled / pre-order delivery is in development and will be available soon. You can subscribe to notifications to get updates when this feature launches.",
        },
        {
          q: "Is SwadKart available outside Jaipur?",
          a: "SwadKart currently serves Jaipur, Rajasthan. We are actively expanding to additional cities across India. If you are a restaurant owner outside Jaipur interested in partnering with us, reach out via the Contact page.",
        },
        {
          q: "How do I become a delivery partner?",
          a: "Delivery partners can register through the app. Requirements include a valid government ID, bank account, and a smartphone with GPS. You earn per-delivery commissions plus incentives during peak hours. Flexible timing — work when you want.",
        },
        {
          q: "How do I register my restaurant on SwadKart?",
          a: "Restaurant owners can sign up from the Restaurant Owner Dashboard. After registration, your menu is reviewed and published within 24-48 hours. You get access to order management, analytics, payout tracking, and promotional tools to boost visibility on the platform.",
        },
        {
          q: "How do I contact customer support?",
          a: "Our support team is available 24/7. You can email us, use the Contact page form, or reach out via in-app chat. SwadPass members get priority support with faster response times.",
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
        <>📧 Email: <a href={`mailto:${SITE.inboxEmail}`} className="text-primary hover:underline">{SITE.email}</a></>,
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
