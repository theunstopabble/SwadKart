import React from "react";
import {
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Send,
  Clock,
  Headphones,
} from "lucide-react";

const Contact = () => {
  const whatsappNumber = "916207793196"; // 👈 अपना व्हाट्सएप नंबर यहाँ डालें (देश कोड के साथ)
  const supportEmail = "swadkartt@gmail.com";

  const openWhatsApp = () => {
    const url = `https://wa.me/${whatsappNumber}?text=Hi SwadKart Support, I need help with my order.`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            <Headphones size={14} /> 24/7 Live Support
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-4">
            Get In <span className="text-primary">Touch</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto font-medium text-sm md:text-base leading-relaxed italic">
            Facing an issue with your delivery or want to partner with us? Our
            team is just a message away.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Quick Contact Cards */}
          <div className="lg:col-span-1 space-y-6">
            {/* WhatsApp Card - Primary CTA */}
            <button
              onClick={openWhatsApp}
              className="w-full bg-[#25D366]/10 border border-[#25D366]/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-[#25D366]/20 transition-all duration-500 shadow-[0_20px_40px_rgba(37,211,102,0.1)]"
            >
              <div className="h-16 w-16 bg-[#25D366] rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">
                WhatsApp Us
              </h3>
              <p className="text-gray-500 text-xs font-bold mb-6">
                Instant support for order tracking & issues.
              </p>
              <span className="bg-[#25D366] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
                Start Chat
              </span>
            </button>

            {/* Email & Phone Card */}
            <div className="bg-gray-950 border border-gray-900 p-8 rounded-[2.5rem] space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">
                    Email Inquiry
                  </p>
                  <p className="text-sm font-bold text-gray-300">
                    {supportEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">
                    Service Hours
                  </p>
                  <p className="text-sm font-bold text-gray-300">
                    10:00 AM - 11:00 PM
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">
                    Headquarters
                  </p>
                  <p className="text-sm font-bold text-gray-300">
                    Jaipur, Rajasthan, IN
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form Section */}
          <div className="lg:col-span-2 bg-gray-950 border border-gray-900 p-10 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
              <div className="h-8 w-1 bg-primary rounded-full"></div> Send a
              Message
            </h2>

            <form className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full bg-black border border-gray-900 rounded-2xl p-4 text-sm font-bold focus:border-primary/50 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Order Issue"
                    className="w-full bg-black border border-gray-900 rounded-2xl p-4 text-sm font-bold focus:border-primary/50 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">
                  Detailed Message
                </label>
                <textarea
                  rows="5"
                  placeholder="How can we help you today?"
                  className="w-full bg-black border border-gray-900 rounded-[2rem] p-6 text-sm font-bold focus:border-primary/50 transition-all outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="group w-full bg-white hover:bg-primary text-black hover:text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 shadow-xl transform active:scale-95"
              >
                Dispatch Message{" "}
                <Send
                  size={18}
                  className="group-hover:translate-x-2 group-hover:-translate-y-1 transition-transform"
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
