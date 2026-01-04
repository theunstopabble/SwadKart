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
  Send,
  Heart,
  ArrowRight,
} from "lucide-react";
import { BASE_URL } from "../config"; // 👈 YE IMPORT ZARURI HAI

const Footer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // 👇 1. YOUR SPECIFIC SOCIAL LINKS
  const socialLinks = [
    {
      Icon: Facebook,
      url: "https://www.facebook.com/gautam.theunstopabble",
      color: "hover:bg-[#1877F2]",
    },
    {
      Icon: Twitter,
      url: "https://x.com/_unstopabble",
      color: "hover:bg-[#1DA1F2]",
    },
    {
      Icon: Instagram,
      url: "https://www.instagram.com/theunstopabble?igsh=MTRrdGMwaDdheWFuMw==",
      color: "hover:bg-[#E4405F]",
    },
    {
      Icon: Linkedin,
      url: "https://www.linkedin.com/in/gautamkr62/",
      color: "hover:bg-[#0A66C2]",
    },
  ];

  // 👇 2. NEWSLETTER HANDLER
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
    } catch (error) {
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
        <div className="flex flex-col lg:flex-row justify-between items-center bg-gray-900/60 backdrop-blur-md p-8 md:p-10 rounded-3xl border border-gray-800 mb-16 shadow-2xl hover:border-primary/30 transition-all duration-500">
          <div className="mb-8 lg:mb-0 text-center lg:text-left max-w-lg">
            <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-3">
              Subscribe to <span className="text-primary">Swad</span> News 📰
            </h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">
              Get the latest updates, secret menu offers, and special promos
              delivered to your inbox.
            </p>
          </div>

          <form
            onSubmit={handleSubscribe}
            className="flex w-full lg:w-auto bg-black border border-gray-700 rounded-full p-1.5 pl-6 focus-within:border-primary transition-all shadow-lg group"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="bg-transparent text-white outline-none w-full md:w-80 placeholder-gray-600 text-sm font-medium"
            />
            <button
              type="submit"
              className="bg-primary hover:bg-red-600 text-white px-8 py-3 rounded-full font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
            >
              Subscribe{" "}
              <Send
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
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
                >
                  <item.Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links (Mapped to InfoPage) */}
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8 border-b border-gray-800 pb-3 w-fit">
              Quick Links
            </h3>
            <ul className="space-y-4">
              {[
                { name: "Home", path: "/" },
                { name: "Menu", path: "/search" },
                { name: "About Us", path: "/page/about-us" }, // 👉 Dynamic
                { name: "Contact", path: "/contact" },
                { name: "Blog", path: "/page/blog" }, // 👉 Dynamic
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

          {/* Column 3: Support Links (Mapped to InfoPage) */}
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8 border-b border-gray-800 pb-3 w-fit">
              Support
            </h3>
            <ul className="space-y-4">
              {[
                { name: "FAQ", path: "/page/faq" }, // 👉 Dynamic
                { name: "Help Center", path: "/page/help" }, // 👉 Dynamic
                { name: "Terms of Service", path: "/page/terms" }, // 👉 Dynamic
                { name: "Privacy Policy", path: "/page/privacy" }, // 👉 Dynamic
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
              {/* 👇 LOCATION LINK ADDED HERE */}
              <li className="group">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Jagannath+University+Chaksu+Campus+Jaipur+Rajasthan"
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
                    (Chaksu Campus)
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
                  href="tel:+911234567890"
                  className="group-hover:text-gray-300 transition-colors font-mono"
                >
                  +91 12345 67890
                </a>
              </li>
              <li className="flex items-center gap-4 text-gray-400 text-sm group">
                <div className="p-2.5 bg-gray-900 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300 border border-gray-800">
                  <Mail size={18} />
                </div>
                <a
                  href="mailto:swadkartt@gmail.com"
                  className="group-hover:text-gray-300 transition-colors"
                >
                  swadkartt@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* --- BOTTOM SECTION: COPYRIGHT --- */}
        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-medium gap-4">
          <p className="text-center md:text-left hover:text-gray-400 transition-colors cursor-default">
            &copy; {new Date().getFullYear()}{" "}
            <span className="text-white font-bold">SwadKart</span>. All rights
            reserved.
          </p>

          <div className="flex items-center gap-1.5 bg-gray-900/50 hover:bg-gray-900 px-4 py-2 rounded-full border border-gray-800 transition-all group">
            Made with
            <Heart
              size={12}
              className="text-red-500 fill-red-500 animate-pulse group-hover:scale-125 transition-transform"
            />
            by
            <a
              href="https://www.linkedin.com/in/gautamkr62/"
              target="_blank"
              rel="noreferrer"
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
