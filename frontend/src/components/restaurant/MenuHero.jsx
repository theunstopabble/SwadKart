import React from "react";
import { Star, MapPin, Clock } from "lucide-react";

const MenuHero = ({ restaurant }) => {
  if (!restaurant) return null;
  return (
    <div className="relative h-72 md:h-96 w-full">
      <img
        src={
          restaurant.image ||
          "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80"
        }
        className="w-full h-full object-cover opacity-40"
        alt={restaurant.name}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-8 max-w-7xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
          {restaurant.name}
        </h1>
        <div className="flex flex-wrap gap-6 text-sm items-center font-bold">
          <span className="bg-green-600 px-3 py-1 rounded-lg flex items-center gap-1 shadow-lg shadow-green-600/20">
            <Star size={14} fill="white" /> {restaurant.rating || "4.5"}
          </span>
          <span className="flex items-center gap-2 text-gray-300 border-l border-gray-700 pl-6">
            <MapPin size={18} className="text-primary" />{" "}
            {restaurant.location || "Jaipur"}
          </span>
          <span className="flex items-center gap-2 text-gray-300 border-l border-gray-800 pl-6">
            <Clock size={18} className="text-primary" /> 30 MINS
          </span>
        </div>
      </div>
    </div>
  );
};

export default MenuHero;
