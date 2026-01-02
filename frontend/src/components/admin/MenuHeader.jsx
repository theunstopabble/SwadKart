import React from "react";
import { UtensilsCrossed, Plus } from "lucide-react";

const MenuHeader = ({
  restaurants,
  selectedRestaurant,
  setSelectedRestaurant,
  openAddItemModal,
}) => {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-center gap-8 bg-gray-900/40 p-10 rounded-[3rem] border border-gray-800 shadow-2xl backdrop-blur-md mb-10">
      <div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
          <UtensilsCrossed className="text-primary" size={40} /> Global{" "}
          <span className="text-primary">Inventory</span>
        </h2>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-3 flex items-center gap-2 pl-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>{" "}
          Master Stock & Dish Control
        </p>
      </div>

      <div className="flex flex-wrap gap-4 w-full xl:w-auto">
        <select
          value={selectedRestaurant}
          onChange={(e) => setSelectedRestaurant(e.target.value)}
          className="flex-1 xl:w-80 bg-black border border-gray-800 rounded-2xl p-4 text-sm font-black uppercase italic tracking-widest text-white focus:border-primary transition-all outline-none"
        >
          <option value="">-- Select Merchant --</option>
          {restaurants.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </select>

        {selectedRestaurant && (
          <button
            onClick={openAddItemModal}
            className="bg-primary hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition-all active:scale-95 text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20"
          >
            <Plus size={20} /> Add New Dish
          </button>
        )}
      </div>
    </div>
  );
};

export default MenuHeader;
