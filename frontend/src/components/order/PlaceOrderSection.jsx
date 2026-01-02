import React from "react";

const PlaceOrderSection = ({ icon, title, label, children }) => (
  <div className="bg-gray-950 p-8 rounded-[2.5rem] border border-gray-900 shadow-2xl relative overflow-hidden group hover:border-gray-800 transition-all">
    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-20"></div>
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
          {title} <span className="text-primary">{label}</span>
        </h2>
        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-0.5">
          Verification Protocol
        </p>
      </div>
    </div>
    <div className="pl-2">{children}</div>
  </div>
);

export default PlaceOrderSection;
