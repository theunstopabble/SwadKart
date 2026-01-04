import React from "react";
import { Star, MapPin, Clock, UtensilsCrossed } from "lucide-react";

const MenuHero = ({ restaurant }) => {
  // If data is not yet loaded, return nothing or a skeleton (returning null here)
  if (!restaurant) return null;

  return (
    <div className="relative h-72 md:h-[450px] w-full bg-gray-900 overflow-hidden">
      {/* 🖼️ Background Image */}
      <img
        src={
          restaurant.image ||
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop"
        }
        className="w-full h-full object-cover opacity-60 animate-in fade-in duration-1000"
        alt={restaurant.name}
      />

      {/* 🌑 Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-6 md:p-12">
        <div className="max-w-7xl mx-auto w-full">
          {/* Restaurant Name */}
          <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter mb-4 text-white drop-shadow-2xl">
            {restaurant.name}
          </h1>

          {/* Cuisine / Description */}
          <p className="text-gray-300 text-sm md:text-lg mb-6 font-medium tracking-wide flex items-center gap-2 uppercase">
            <UtensilsCrossed size={16} className="text-primary" />
            {restaurant.cuisine || "Multi-Cuisine • Fast Food • Beverages"}
          </p>

          {/* Meta Info Badges */}
          <div className="flex flex-wrap gap-4 md:gap-8 text-sm items-center font-bold">
            {/* Rating Badge */}
            <span className="bg-green-600 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-green-600/20 text-white">
              <Star size={16} fill="white" /> {restaurant.rating || "4.5"}
            </span>

            {/* Location */}
            <span className="flex items-center gap-2 text-gray-300 md:border-l border-gray-600 md:pl-8">
              <MapPin size={20} className="text-primary" />
              {restaurant.address || restaurant.location || "Jaipur, Rajasthan"}
            </span>

            {/* Time */}
            <span className="flex items-center gap-2 text-gray-300 md:border-l border-gray-600 md:pl-8">
              <Clock size={20} className="text-primary" />
              {restaurant.deliveryTime || "30-40"} MINS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuHero;
