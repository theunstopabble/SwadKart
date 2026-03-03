import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Heart,
} from "lucide-react";
import { BASE_URL } from "../config";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // 👇 CONFIGURATION: Change these to update footer info centrally
  // In Vite/React, frontend env vars usually need 'VITE_' prefix.
  // Using a fallback here ensures it looks professional immediately.
  const SUPPORT_EMAIL =
    import.meta.env.VITE_SUPPORT_EMAIL || "support@swadkart.com";
  const SUPPORT_PHONE = "+91 98765 43210";

  const socialLinks = [
    {
      Icon: Facebook,
      url: "https://www.facebook.com/gautam.theunstopabble",
      color: "hover:bg-[#1877F2]",
      label: "Facebook",
    },
    {
      Icon: Twitter,
      url: "https://x.com/_unstopabble",
      color: "hover:bg-[#1DA1F2]",
      label: "Twitter",
    },
    {
      Icon: Instagram,
      url: "https://www.instagram.com/theunstopabble/",
      color: "hover:bg-[#E4405F]",
      label: "Instagram",
    },
    {
      Icon: Linkedin,
      url: "https://www.linkedin.com/in/gautamkr62/",
      color: "hover:bg-[#0A66C2]",
      label: "LinkedIn",
    },
  ];

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email 📧");

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Subscribed successfully! Admin Notified 🚀");
        setEmail("");
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch {
      toast.error("Network Error 😔");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-gray-950 text-white pt-20 pb-10 border-t border-gray-900 relative overflow-hidden font-sans">
      {/* ✨ Background Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* --- TOP SECTION: NEWSLETTER --- */}
        <div className="flex flex-col items-center bg-[#0d1117] p-8 md:p-12 rounded-[2.5rem] border border-gray-800 mb-16 shadow-2xl relative overflow-hidden">
          <div className="text-center max-w-2xl mb-10">
            <h3 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-4 leading-tight">
              SUBSCRIBE TO <span className="text-primary">SWAD</span> NEWS 📰
            </h3>
            <p className="text-gray-400 text-sm font-medium">
              Get the latest updates, secret menu offers, and special promos
              delivered to your inbox.
            </p>
          </div>

          <form
            onSubmit={handleSubscribe}
            className="flex items-center bg-[#000] border border-gray-700 rounded-full w-full overflow-hidden focus-within:border-[#ef4444] transition-all"
          >
            <input
              type="email"
              placeholder="Enter your email address..."
              className="flex-1 bg-transparent px-4 py-3 text-gray-300 outline-none min-w-0"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#ef4444] hover:bg-red-600 text-white font-bold px-4 py-3 h-full transition-all shrink-0 disabled:opacity-50"
            >
              {loading ? "..." : "Subscribe"}
            </button>
          </form>
        </div>

        {/* --- MIDDLE SECTION: LINKS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Column 1: Brand & Social */}
          <div className="space-y-6">
            <Link
              to="/"
              className="text-4xl font-black tracking-tighter text-primary flex items-center gap-1 group w-fit"
            >
              Swad
              <span className="text-white group-hover:text-gray-300 transition-colors">
                Kart
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary mt-4 animate-bounce"></span>
            </Link>
            <p className="text-gray-400 text-sm leading-7 font-medium pr-4">
              Experience the best food delivery service in town. Fresh, hot, and
              tasty meals delivered right to your doorstep within minutes. ⚡
            </p>

            <div className="flex gap-3 pt-2">
              {socialLinks.map((item, index) => (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`bg-gray-900 border border-gray-800 p-3 rounded-xl text-gray-400 hover:text-white transition-all duration-300 hover:-translate-y-1 shadow-lg ${item.color}`}
                  aria-label={item.label}
                >
                  <item.Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8 border-b border-gray-800 pb-3 w-fit">
              Quick Links
            </h3>
            <ul className="space-y-4">
              {[
                { name: "Home", path: "/" },
                { name: "Menu", path: "/search" },
                { name: "About Us", path: "/page/about-us" },
                { name: "Contact", path: "/contact" },
                { name: "Blog", path: "/page/blog" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="text-gray-400 hover:text-primary transition-all text-sm flex items-center gap-2 group font-medium"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 text-primary"
                    />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Support Links */}
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8 border-b border-gray-800 pb-3 w-fit">
              Support
            </h3>
            <ul className="space-y-4">
              {[
                { name: "FAQ", path: "/page/faq" },
                { name: "Help Center", path: "/page/help" },
                { name: "Terms of Service", path: "/page/terms" },
                { name: "Privacy Policy", path: "/page/privacy" },
                { name: "Cookie Policy", path: "/page/privacy" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="text-gray-400 hover:text-primary transition-all text-sm flex items-center gap-2 group font-medium"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 text-primary"
                    />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8 border-b border-gray-800 pb-3 w-fit">
              Contact Us
            </h3>
            <ul className="space-y-6">
              <li className="group">
                <a
                  href="https://maps.app.goo.gl/WWxfroXJsRiHZv8c7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 text-gray-400 text-sm transition-all"
                >
                  <div className="p-2.5 bg-gray-900 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300 border border-gray-800 flex-shrink-0">
                    <MapPin size={18} />
                  </div>
                  <span className="leading-relaxed group-hover:text-gray-300 transition-colors">
                    Jagannath University
                    <br />
                    Jaipur, Rajasthan, India
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-4 text-gray-400 text-sm group">
                <div className="p-2.5 bg-gray-900 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300 border border-gray-800">
                  <Phone size={18} />
                </div>
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="group-hover:text-gray-300 transition-colors font-mono"
                >
                  {SUPPORT_PHONE}
                </a>
              </li>
              <li className="flex items-center gap-4 text-gray-400 text-sm group">
                <div className="p-2.5 bg-gray-900 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300 border border-gray-800">
                  <Mail size={18} />
                </div>
                {/* ✅ FIXED: Uses Variable now */}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group-hover:text-gray-300 transition-colors"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-medium gap-4">
          <p className="text-center md:text-left hover:text-gray-400 transition-colors cursor-default flex items-center gap-1">
            © {new Date().getFullYear()}
            <span className="font-extrabold tracking-tighter ml-1">
              <span className="text-primary">Swad</span>
              <span className="text-white">Kart</span>
            </span>
            . All rights reserved.
          </p>

          <div className="flex items-center gap-1.5 bg-gray-900/50 hover:bg-gray-900 px-4 py-2 rounded-full border border-gray-800 transition-all group">
            Made with
            <Heart
              size={12}
              className="text-red-500 fill-red-500 animate-pulse group-hover:scale-125 transition-transform"
            />
            by
            <a
              href="#"
              className="text-white font-bold group-hover:text-primary transition-colors"
            >
              Gautam Kumar
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
