import React from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-950 text-white pt-16 pb-8 border-t border-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Section: Newsletter */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900/50 p-8 rounded-2xl border border-gray-800 mb-12">
          <div className="mb-6 md:mb-0">
            <h3 className="text-2xl font-bold mb-2">
              Subscribe to our Newsletter
            </h3>
            <p className="text-gray-400 text-sm">
              Get the latest updates, offers and special promos.
            </p>
          </div>
          <div className="flex w-full md:w-auto bg-gray-950 border border-gray-700 rounded-full p-1 pl-4 focus-within:border-primary transition-colors">
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-transparent text-white outline-none w-full md:w-64 placeholder-gray-500"
            />
            <button className="bg-primary hover:bg-red-600 text-white px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2">
              Subscribe <Send size={16} />
            </button>
          </div>
        </div>

        {/* Middle Section: Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Column 1: Brand Info */}
          <div>
            {/* 👇 FIX: Swad (Primary) + Kart (White) - Same as Navbar */}
            <h2 className="text-3xl font-extrabold text-primary mb-4 tracking-tight flex items-center">
              Swad<span className="text-white">Kart</span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Experience the best food delivery service in town. Fresh, hot, and
              tasty meals delivered right to your doorstep within minutes.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="bg-gray-900 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-primary transition-all duration-300"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-primary/30 pb-2 w-fit">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {["Home", "Menu", "About Us", "Contact", "Blog"].map((item) => (
                <li key={item}>
                  <Link
                    to="/"
                    className="text-gray-400 hover:text-primary transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-[2px] bg-primary transition-all duration-300"></span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal & Support */}
          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-primary/30 pb-2 w-fit">
              Support
            </h3>
            <ul className="space-y-3">
              {[
                "FAQ",
                "Help Center",
                "Terms of Service",
                "Privacy Policy",
                "Cookie Policy",
              ].map((item) => (
                <li key={item}>
                  <Link
                    to="/"
                    className="text-gray-400 hover:text-primary transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-[2px] bg-primary transition-all duration-300"></span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-primary/30 pb-2 w-fit">
              Contact Us
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin className="text-primary mt-1 shrink-0" size={18} />
                <span>
                  Jagannath University (Chaksu Campus)
                  <br />
                  Jaipur, Rajasthan, India
                </span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone className="text-primary shrink-0" size={18} />
                <span>+91 6207793196</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail className="text-primary shrink-0" size={18} />
                <span>swadkartt@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Copyright */}
        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          {/* 👇 FIX: Iska color bhi Primary kar diya hai */}
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="text-primary font-bold">Swad</span>
            <span className="text-white">Kart</span>. All rights reserved.
          </p>
          <p className="flex items-center gap-1 mt-2 md:mt-0">
            Made with{" "}
            <Heart
              size={14}
              className="text-red-500 fill-red-500 animate-pulse"
            />{" "}
            by <span className="text-white font-bold">Gautam Kumar</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
