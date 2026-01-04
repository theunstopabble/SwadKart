import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, HelpCircle, Shield, Info } from "lucide-react";

const InfoPage = () => {
  const { type } = useParams(); // URL se type nikalo (e.g., 'privacy', 'terms')

  // 📝 DATA STORE: Saara content yahin define kar do
  const contentData = {
    "about-us": {
      title: "About SwadKart",
      icon: <Info size={40} className="text-primary" />,
      text: "SwadKart is Jaipur's fastest growing food delivery platform. Started with a vision to deliver hot and fresh food within minutes, we partner with the best local restaurants to bring you authentic taste.",
      details: [
        "🚀 Started in 2024",
        "📍 HQ: Jaipur, Rajasthan",
        "🍔 500+ Restaurant Partners",
      ],
    },
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
          a: "Yes, within 1 minute of placing it. After that, preparation begins.",
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
    help: {
      title: "Help Center",
      icon: <HelpCircle size={40} className="text-primary" />,
      text: "Need support? Our team is available 24/7.",
      details: [
        "📞 Call: +91 12345 67890",
        "📧 Email: swadkartt@gmail.com",
        "💬 Chat Support: Coming Soon",
      ],
    },
  };

  // Agar koi galat URL daal de (e.g., /page/xyz)
  const data = contentData[type];

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center pt-20">
        <h2 className="text-3xl font-bold text-red-500">
          404 - Page Not Found
        </h2>
        <Link to="/" className="mt-4 text-gray-400 hover:text-white">
          Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-10 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-8 w-fit"
        >
          <ArrowLeft size={20} /> Back to Home
        </Link>

        {/* Header Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="bg-black p-4 rounded-2xl border border-gray-800 shadow-xl">
              {data.icon}
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">
                {data.title}
              </h1>
              <p className="text-gray-400 mt-2 text-lg">
                Everything you need to know.
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 md:p-12 shadow-2xl">
          <p className="text-xl text-gray-300 leading-relaxed mb-8 border-l-4 border-primary pl-6">
            {data.text}
          </p>

          {/* Specific Rendering Logic */}
          {data.details && (
            <ul className="space-y-4">
              {data.details.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-gray-400 bg-gray-900/50 p-4 rounded-xl border border-gray-800"
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>{" "}
                  {item}
                </li>
              ))}
            </ul>
          )}

          {data.questions && (
            <div className="space-y-6">
              {data.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 p-6 rounded-2xl border border-gray-800"
                >
                  <h3 className="font-bold text-white text-lg mb-2">
                    ❓ {q.q}
                  </h3>
                  <p className="text-gray-400 pl-6 border-l-2 border-gray-700">
                    {q.a}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPage;
