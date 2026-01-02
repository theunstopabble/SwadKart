import React from "react";
import { Search } from "lucide-react";

const MenuFilters = ({
  searchTerm,
  setSearchTerm,
  isVegOnly,
  setIsVegOnly,
}) => {
  return (
    <div className="sticky top-16 z-30 bg-black/80 backdrop-blur-md border-b border-gray-900 py-6">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="relative w-full md:w-96 group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search for your favorite dish..."
            className="w-full bg-gray-950 border border-gray-800 text-white pl-12 pr-4 py-3 rounded-2xl focus:border-primary/50 outline-none transition-all text-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-gray-900 p-1.5 rounded-2xl border border-gray-800 shadow-xl">
          <button
            onClick={() => setIsVegOnly(false)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              !isVegOnly
                ? "bg-primary text-white"
                : "text-gray-500 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setIsVegOnly(true)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              isVegOnly
                ? "bg-green-600 text-white"
                : "text-gray-500 hover:text-white"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isVegOnly ? "bg-white" : "bg-green-600"
              }`}
            ></div>{" "}
            Veg Only
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuFilters;
