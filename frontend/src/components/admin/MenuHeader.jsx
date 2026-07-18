import React from "react";
import { UtensilsCrossed, Plus } from "lucide-react";

const MenuHeader = ({
  restaurants,
  selectedRestaurant,
  setSelectedRestaurant,
  openAddItemModal,
}) => {
  return (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-gray-900/40 p-5 sm:p-8 rounded-2xl sm:rounded-[3rem] border border-gray-800 shadow-2xl backdrop-blur-md">
  <div className="min-w-0">
  <h2 className="text-lg sm:text-2xl lg:text-3xl font-black uppercase tracking-tighter flex items-center flex-wrap gap-1.5 sm:gap-3 leading-none">
  <UtensilsCrossed className="text-primary shrink-0" size={20} /> <span>Global</span>
  <span className="text-primary">Inventory</span>
  </h2>
  <div className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.25em] sm:tracking-[0.4em] mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
  <div className="w-0.5 h-0.5 sm:w-1 sm:h-1.5 rounded-full bg-primary animate-pulse"></div>
  <span className="truncate">Master Stock & Dish Control</span>
  </div>
  </div>

  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto md:w-auto">
  <select
  value={selectedRestaurant}
  onChange={(e) => setSelectedRestaurant(e.target.value)}
  className="w-full md:min-w-[280px] bg-black border border-gray-800 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm font-black uppercase tracking-wider sm:tracking-widest text-white focus:border-primary transition-all outline-none"
  >
  <option value="">Select a Restaurant</option>
  {(restaurants || []).map((r) => (
  <option key={r._id} value={r._id}>
  {r.name}
  </option>
  ))}
  </select>

  {selectedRestaurant && (
  <button
  onClick={openAddItemModal}
  className="bg-primary hover:bg-red-600 text-white font-black py-3 sm:py-4 px-6 sm:px-10 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[9px] sm:text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20 w-full sm:w-auto"
  >
  <Plus size={16} /> Add New Dish
  </button>
  )}
  </div>
  </div>
  );
};

export default MenuHeader;
