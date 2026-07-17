import React, { useState } from "react";
import { Mail, MapPin, Send, Clock, Headphones, Phone } from "lucide-react";
import { toast } from "react-hot-toast";
import { BASEURL } from "../config";
import { SITE } from "../utils/seoConstants";
import PageSEO from "../components/SEO/PageSEO";
import { toJsonLd, contactPageSchema, breadcrumbSchema } from "../utils/structuredData";

const Contact = () => {
  const supportPhone = "+91 98765 43210";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.subject ||
      !formData.message
    ) {
      return toast.error("Please fill all fields! ✍️");
    }

    // TODO: Add CAPTCHA / rate-limit to prevent spam
    setLoading(true);
    try {
      const res = await fetch(`${BASEURL}/api/v1/users/contact-support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success(data.message || "Message dispatched successfully!");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch {
      toast.error("Network error: Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  const contactSchema = contactPageSchema();
  const contactBreadcrumb = breadcrumbSchema([{
    name: "Home", url: "/" }, { name: "Contact", url: "/contact" }]);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 px-6 font-sans">
      <PageSEO
        title="Contact SwadKart Support | 24/7 Customer Care"
        description="Need help? Contact SwadKart's 24/7 customer support team. Email, phone, or fill our form for quick assistance with orders, deliveries, and more."
        keywords="SwadKart contact, customer support, food delivery help, order issue, 24/7 support"
        canonicalPath="/contact"
        jsonLdScripts={[toJsonLd(contactSchema), toJsonLd(contactBreadcrumb)]}
      />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            <Headphones size={14} /> 24/7 Live Support
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold italic uppercase tracking-tighter mb-4">
            Get In <span className="text-primary">Touch</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto font-medium text-sm md:text-base leading-relaxed italic">
            Facing an issue with your delivery or want to partner with us? Our
            team is just a message away.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] space-y-8 shadow-2xl h-full">
              <div className="flex items-center gap-4 group">
                <div className="h-12 w-12 bg-black/50 rounded-xl flex items-center justify-center text-primary border border-gray-800 group-hover:border-primary/50 transition-colors">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    Email Inquiry
                  </p>
                  <a
                    href={`mailto:${SITE.inboxEmail}`}
                    className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
                  >
                    {SITE.email}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="h-12 w-12 bg-black/50 rounded-xl flex items-center justify-center text-green-500 border border-gray-800 group-hover:border-green-500/50 transition-colors">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    Support Line
                  </p>
                  <a
                    href={`tel:${supportPhone}`}
                    className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
                  >
                    {supportPhone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="h-12 w-12 bg-black/50 rounded-xl flex items-center justify-center text-blue-500 border border-gray-800 group-hover:border-blue-500/50 transition-colors">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    Service Hours
                  </p>
                  <p className="text-sm font-bold text-gray-300">
                    10:00 AM - 11:00 PM
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="h-12 w-12 bg-black/50 rounded-xl flex items-center justify-center text-orange-500 border border-gray-800 group-hover:border-orange-500/50 transition-colors">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    Headquarters
                  </p>
                  <p className="text-sm font-bold text-gray-300">
                    Jaipur, Rajasthan, IN
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 p-10 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

            <h2 className="text-3xl font-extrabold italic uppercase tracking-tighter mb-8 flex items-center gap-3">
              <div className="h-8 w-1.5 bg-primary rounded-full"></div> Send a
              Message
            </h2>

            <form
              onSubmit={handleFormSubmit}
              className="space-y-6 relative z-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full bg-black/50 border border-gray-700 rounded-xl p-4 text-sm font-bold text-white focus:border-primary focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="w-full bg-black/50 border border-gray-700 rounded-xl p-4 text-sm font-bold text-white focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Order Issue"
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-4 text-sm font-bold text-white focus:border-primary focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">
                  Detailed Message
                </label>
                <textarea
                  rows="5"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we help you today?"
                  className="w-full bg-black/50 border border-gray-700 rounded-[1.5rem] p-6 text-sm font-bold text-white focus:border-primary focus:outline-none transition-all resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-extrabold text-xs uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Dispatching..." : "Dispatch Message"}
                <Send
                  size={18}
                  className={`${
                    loading
                      ? "hidden"
                      : "group-hover:translate-x-2 group-hover:-translate-y-1 transition-transform"
                  }`}
                />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
