import React, { useState } from "react";
import {
  UtensilsCrossed,
  PlusCircle,
  Edit2,
  Trash2,
  Power,
  GripVertical,
  Loader2,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

const MenuManagement = ({
  menuItems,
  openAddModal,
  openEditModal,
  handleDeleteItem,
  handleReorder,
  handleToggleStock,
}) => {
  const items = Array.isArray(menuItems) ? menuItems : [];
  const [saving, setSaving] = useState(false);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    setSaving(true);
    const promise = handleReorder(reordered);
    if (promise && promise.finally) {
      promise.finally(() => setSaving(false));
    } else {
      setTimeout(() => setSaving(false), 600);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="text-primary shrink-0" /> Menu Lab{" "}
            <span className="text-sm font-bold text-gray-500 bg-gray-800 px-2.5 py-0.5 rounded-full">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </h2>
          {saving && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
              <Loader2 size={12} className="animate-spin" /> Saving...
            </span>
          )}
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-primary hover:bg-red-600 text-white font-bold py-2.5 sm:py-2 px-6 rounded-full flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <PlusCircle size={20} /> Add Item
        </button>
      </div>

      {/* Drag-and-Drop List / Grid */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="menu-items">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0 transition-all ${snapshot.isDraggingOver ? "opacity-90" : ""}`}
            >
              {items.map((item, index) => {
                const isSoldOut = item.countInStock <= 0;
                return (
                <Draggable
                  key={item._id}
                  draggableId={String(item._id)}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-gray-900 border rounded-xl md:rounded-2xl overflow-hidden transition-all shadow-md ${
                        snapshot.isDragging
                          ? "border-primary shadow-2xl shadow-primary/20 scale-[1.02] rotate-[0.5deg] z-50"
                          : isSoldOut
                          ? "border-gray-800/50 opacity-75"
                          : "border-gray-800 hover:border-primary/50 hover:shadow-xl"
                      }`}
                    >
                      {/* ===================== MOBILE LAYOUT ===================== */}
                      <div className="md:hidden">
                        {/* Drag Handle Bar — Mobile Full Width */}
                        <div
                          {...provided.dragHandleProps}
                          title="Drag to reorder"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-800/20 cursor-grab active:cursor-grabbing hover:bg-primary/10 transition-colors select-none"
                        >
                          <GripVertical size={14} className="text-gray-600 shrink-0" />
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                            Drag to reorder
                          </span>
                          <span className="text-[9px] text-gray-700 font-bold ml-auto tabular-nums">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Image — Mobile */}
                        <div className="relative h-36 overflow-hidden bg-black/40">
                          <img
                            src={item.image || "https://placehold.co/600x400?text=No+Image"}
                            alt={item.name}
                            className={`w-full h-full object-cover ${isSoldOut ? "opacity-40" : ""}`}
                          />
                          <span
                            className={`absolute top-2 left-2 w-3.5 h-3.5 rounded-full border-2 shadow-lg ${
                              item.isVeg
                                ? "bg-green-500 border-green-300"
                                : "bg-red-500 border-red-300"
                            }`}
                            title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          />
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-white font-black text-lg uppercase tracking-[0.15em]">Sold Out</span>
                            </div>
                          )}
                        </div>

                        {/* Content — Mobile */}
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-sm text-white truncate flex-1">{item.name}</h3>
                            <span className="text-primary font-bold text-base shrink-0">₹{item.price}</span>
                          </div>
                          {item.category && (
                            <span className="inline-block text-[9px] font-bold text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              {item.category}
                            </span>
                          )}
                          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                            {item.description || "No description added"}
                          </p>
                        </div>

                        {/* Actions — Mobile: 3 Buttons */}
                        <div className="flex gap-2 px-3 pb-3">
                          <button
                            onClick={() => item._id && handleToggleStock(item._id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                              isSoldOut
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                            }`}
                          >
                            <Power size={12} />
                            {isSoldOut ? "Sold Out" : `${item.countInStock} in Stock`}
                          </button>
                          <button
                            onClick={() => item && openEditModal(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold bg-gray-800 text-gray-300 hover:bg-blue-600/20 hover:text-blue-400 transition-all"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => item._id && handleDeleteItem(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold bg-gray-800 text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>

                      {/* ===================== DESKTOP LAYOUT ===================== */}
                      <div className="hidden md:block">
                        {/* Image — Desktop with drag handle + stock toggle */}
                        <div className="relative h-40 overflow-hidden bg-black/40">
                          <img
                            src={item.image || "https://placehold.co/600x400?text=No+Image"}
                            alt={item.name}
                            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isSoldOut ? "opacity-40" : ""}`}
                          />
                          {/* Drag Handle — Desktop (absolute on image) */}
                          <div
                            {...provided.dragHandleProps}
                            title="Drag to reorder"
                            className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 hover:bg-primary/80 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing transition-all z-10 backdrop-blur-sm"
                          >
                            <GripVertical size={14} />
                          </div>
                          {/* Veg/Non-Veg Badge — Desktop top-right */}
                          <span
                            className={`absolute top-2 right-2 w-3.5 h-3.5 rounded-full border-2 shadow-lg z-10 ${
                              item.isVeg
                                ? "bg-green-500 border-green-300"
                                : "bg-red-500 border-red-300"
                            }`}
                            title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          />
                          {/* Stock Toggle — Desktop bottom-left */}
                          <button
                            onClick={() => item._id && handleToggleStock(item._id)}
                            className={`absolute bottom-2 left-2 p-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black border z-10 transition-all shadow-lg backdrop-blur-sm ${
                              isSoldOut
                                ? "bg-red-500/20 text-red-400 border-red-500/50"
                                : "bg-green-500/20 text-green-400 border-green-500/50"
                            }`}
                            title={isSoldOut ? "Sold Out" : `${item.countInStock} in stock`}
                          >
                            <Power size={12} />
                            {isSoldOut ? "SOLD OUT" : `${item.countInStock}`}
                          </button>
                          {/* Sold Out Overlay */}
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[5]">
                              <span className="text-white font-black text-xl uppercase tracking-[0.15em]">Sold Out</span>
                            </div>
                          )}
                        </div>

                        {/* Content — Desktop */}
                        <div className="p-4 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-base text-white truncate flex-1">{item.name}</h3>
                            <span className="text-primary font-bold text-lg shrink-0">₹{item.price}</span>
                          </div>
                          {item.category && (
                            <span className="inline-block text-[10px] font-bold text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              {item.category}
                            </span>
                          )}
                          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 min-h-[2.5em]">
                            {item.description || "No description added"}
                          </p>
                        </div>

                        {/* Actions — Desktop: 2 Buttons */}
                        <div className="flex gap-2 px-4 pb-4">
                          <button
                            onClick={() => item && openEditModal(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-gray-800 text-gray-300 hover:bg-blue-600 hover:text-white transition-all"
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => item._id && handleDeleteItem(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-gray-800 text-gray-300 hover:bg-red-600 hover:text-white transition-all"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <UtensilsCrossed size={52} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold text-xl text-gray-400">Your menu is empty</p>
          <p className="text-sm text-gray-600 mt-1">
            Tap <span className="text-primary font-bold">&ldquo;Add Item&rdquo;</span> to create your first dish
          </p>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
