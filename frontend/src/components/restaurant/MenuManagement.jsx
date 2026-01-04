import React from "react";
import {
  UtensilsCrossed,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Power,
} from "lucide-react";

const MenuManagement = ({
  menuItems,
  openAddModal,
  openEditModal,
  handleDeleteItem,
  handleReorder,
  handleToggleStock,
}) => {
  // 🛡️ Ensure menuItems is an array to prevent crash
  const items = Array.isArray(menuItems) ? menuItems : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UtensilsCrossed className="text-primary" /> Manage Menu (
          {items.length})
        </h2>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <PlusCircle size={20} /> Add Item
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, index) => (
          <div
            key={item._id}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group relative hover:border-primary/50 transition-all shadow-md hover:shadow-xl"
          >
            {/* Image Container */}
            <div className="h-40 relative overflow-hidden">
              <img
                src={item.image || "https://placehold.co/600x400?text=No+Image"}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />

              {/* Stock Toggle Button */}
              <button
                onClick={() => handleToggleStock(item._id)}
                className={`absolute bottom-2 left-2 p-2 rounded-lg flex items-center gap-2 text-[10px] font-black border z-10 transition-all shadow-lg backdrop-blur-sm ${
                  item.countInStock > 0
                    ? "bg-green-500/20 text-green-400 border-green-500/50"
                    : "bg-red-500/20 text-red-500 border-red-500/50"
                }`}
              >
                <Power size={12} />{" "}
                {item.countInStock > 0 ? "AVAILABLE" : "SOLD OUT"}
              </button>

              {/* Reorder Buttons (Optional if backend supports it) */}
              {handleReorder && (
                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleReorder(index, -1)}
                    disabled={index === 0}
                    className="bg-black/60 hover:bg-primary p-1.5 rounded-lg text-white disabled:opacity-30 backdrop-blur-md"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleReorder(index, 1)}
                    disabled={index === items.length - 1}
                    className="bg-black/60 hover:bg-primary p-1.5 rounded-lg text-white disabled:opacity-30 backdrop-blur-md"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-lg truncate w-3/4 text-white group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                <span className="text-primary font-bold">₹{item.price}</span>
              </div>

              <p className="text-gray-500 text-xs mb-4 line-clamp-2 min-h-[2.5em]">
                {item.description || "No description provided."}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(item)}
                  className="flex-1 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDeleteItem(item._id)}
                  className="flex-1 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuManagement;
