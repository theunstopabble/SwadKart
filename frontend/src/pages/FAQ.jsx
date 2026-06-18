import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import PageSEO from "../components/SEO/PageSEO";
import { toJsonLd, faqPageSchema } from "../utils/structuredData";

const faqItems = [
  {
    question: "What is SwadKart and how does it work?",
    answer:
      "SwadKart is an AI-powered multi-vendor food delivery platform connecting customers with top restaurants in Jaipur. Simply browse restaurants, add items to your cart, and checkout with secure Razorpay payments. Track your order in real-time with GPS tracking.",
  },
  {
    question: "Is SwadKart available in Jaipur only?",
    answer:
      "Currently, SwadKart primarily serves Jaipur, Rajasthan. We are expanding rapidly and plan to cover more cities across India soon. Stay tuned for updates!",
  },
  {
    question: "Does SwadKart have an AI chatbot for food recommendations?",
    answer:
      "Yes! SwadKart features a Groq LLM-powered AI chatbot that understands natural language. Ask 'Show me biryani under ₹200' or 'Best pizza near me' and get instant, personalized recommendations.",
  },
  {
    question: "Can I use voice search to find food on SwadKart?",
    answer:
      "Absolutely. SwadKart supports voice search in both English and Hindi. Tap the microphone icon and say what you're craving — our AI will find the best matches instantly.",
  },
  {
    question: "What payment methods does SwadKart accept?",
    answer:
      "We accept UPI, Credit Cards, Debit Cards, Net Banking, and Cash on Delivery (COD). All transactions are secured with Razorpay's industry-standard encryption.",
  },
  {
    question: "How can I track my order in real-time?",
    answer:
      "Once your order is confirmed, you can track it live on the map. Our delivery partners share GPS coordinates via Socket.IO, so you see the exact location and estimated arrival time.",
  },
  {
    question: "What is SwadPass subscription?",
    answer:
      "SwadPass is our premium subscription that gives you unlimited free delivery, an extra 10% discount on every order, and priority customer support. It's the smartest way to save on food delivery!",
  },
  {
    question: "Does SwadKart support group ordering?",
    answer:
      "Yes! Our Group Orders feature lets you invite friends, split the bill equally or item-wise, and checkout together. Perfect for parties and office lunches.",
  },
  {
    question: "Can I earn rewards or SwadCoins on SwadKart?",
    answer:
      "Definitely. You earn SwadCoins on every order, which can be redeemed for discounts. We also have streak badges, achievement-based rewards, and a referral program to earn even more.",
  },
  {
    question: "How do I contact SwadKart customer support?",
    answer:
      "You can reach our support team 24/7 via email at support@swadkart.com or through the Contact page. Premium SwadPass members get fast-track support with priority response.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const faqSchema = faqPageSchema(faqItems);
  const jsonLd = toJsonLd(faqSchema);

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-8 py-12">
      <PageSEO
        title="Frequently Asked Questions (FAQ)"
        description="Find answers to all your questions about SwadKart — Jaipur's AI-powered food delivery app. Learn about payments, delivery, SwadPass, rewards, and more."
        keywords="SwadKart FAQ, food delivery questions, how SwadKart works, order tracking, SwadPass, SwadCoins, group orders"
        canonicalPath="/faq"
        jsonLd={[jsonLd]}
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4 ring-1 ring-primary/50">
            <HelpCircle size={32} className="text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter mb-4">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Everything you need to know about ordering food with SwadKart. Can't
            find your answer? Contact our support team.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/30"
            >
              <button
                onClick={() => toggle(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left group"
              >
                <span className="text-lg font-semibold text-white group-hover:text-primary transition-colors pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index
                    ? "max-h-[500px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 pb-5 text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 p-8 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-3xl text-center">
          <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
          <p className="text-gray-400 mb-3 text-sm">
            Our support team is available 24/7 to help you with any queries.
          </p>
          <a
            href="/contact"
            className="inline-block mt-4 bg-primary text-white px-8 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
