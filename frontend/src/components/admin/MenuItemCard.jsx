import React from "react";
import { Power, Edit2, Trash2, Layers, Tag } from "lucide-react";

const MenuItemCard = ({ item, onToggleStock, onEdit, onDelete }) => {
  const inStock = item.countInStock > 0;
  const hasVariants = item.variants && item.variants.length > 0;
  const hasAddons = item.addons && item.addons.length > 0;

  return (
  <div className="bg-gray-950 border border-gray-900 rounded-2xl sm:rounded-[2.5rem] overflow-hidden group relative hover:border-primary/40 transition-all shadow-2xl">
  <div className="h-40 sm:h-48 relative overflow-hidden">
  <img
  src={item.image || "https://via.placeholder.com/300"}
  className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${
  !inStock ? "grayscale opacity-40" : "opacity-60"
  }`}
  alt={item.name}
  />

  <button
  onClick={() => onToggleStock(item._id)}
  className={`absolute bottom-3 sm:bottom-4 left-3 sm:left-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-2 text-[8px] sm:text-[9px] font-black border backdrop-blur-md transition-all z-20 ${
  inStock
  ? "bg-green-500/20 text-green-400 border-green-500/30"
  : "bg-red-500/20 text-red-400 border-red-500/30"
  }`}
  >
  <Power size={10} /> {inStock ? "AVAILABLE" : "SOLD OUT"}
  </button>

  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-1.5 sm:gap-2">
  {hasVariants && (
  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[7px] sm:text-[8px] font-black px-1.5 sm:px-2 py-1 rounded-full uppercase">
  <Layers size={8} />
  </span>
  )}
  {hasAddons && (
  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[7px] sm:text-[8px] font-black px-1.5 sm:px-2 py-1 rounded-full uppercase">
  <Tag size={8} />
  </span>
  )}

  <span
  className={`text-[7px] sm:text-[8px] font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest border ${
  item.isVeg
  ? "bg-green-500/10 text-green-500 border-green-500/20"
  : "bg-red-500/10 text-red-500 border-red-500/20"
  }`}
  >
  {item.isVeg ? "VEG" : "NON-VEG"}
  </span>
  </div>
  </div>

  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
  <div className="flex justify-between items-start gap-2">
  <div className="min-w-0">
  <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-primary transition-colors truncate">
  {item.name}
  </h3>
  <p className="text-[9px] sm:text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1 truncate">
  {item.category}
  </p>
  </div>
  <span className="text-base sm:text-xl font-black text-white tracking-tighter shrink-0">
  ₹{item.price}
  </span>
  </div>

  <div className="flex items-center gap-2 sm:gap-3 bg-black/40 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-900">
  <button
  onClick={() => onEdit(item)}
  className="flex-1 bg-gray-900 hover:bg-blue-600/20 hover:text-blue-400 text-gray-500 p-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest"
  >
  <Edit2 size={12} /> Edit
  </button>
  <button
  onClick={() => onDelete(item._id)}
  className="flex-1 bg-gray-900 hover:bg-red-600/20 hover:text-red-400 text-gray-500 p-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest"
  >
  <Trash2 size={12} /> Delete
  </button>
  </div>
  </div>
  </div>
  );
};

export default MenuItemCard;
