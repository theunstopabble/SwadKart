import React, { useState, useEffect } from "react";
import {
 X,
 Layers,
 PlusCircle,
 Trash2,
 Upload,
 Loader2,
 Link as LinkIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASEURL } from "../../config";
const ItemModal = ({
 showModal,
 setShowModal,
 isEditing,
 newItem,
 setNewItem,
 handleSubmitItem,
 imageMode: imageModeProp,
}) => {
 const [uploading, setUploading] = useState(false);
 const [imageMode, setImageMode] = useState("url");

 useEffect(() => {
 if (imageModeProp) {
 setImageMode(imageModeProp);
 return;
 }
 if (showModal && newItem.image) {
 setImageMode(newItem.image.match(/cloudinary|res\.cloudinary/i) ? "upload" : "url");
 }
 }, [showModal, newItem.image, imageModeProp]);

 if (!showModal) return null;

 const descLen = (newItem.description || "").length;

 const uploadFileHandler = async (e) => {
 const file = e.target.files[0];
 if (!file) return;

 const formData = new FormData();
 formData.append("image", file);
 setUploading(true);

 try {
 const res = await fetch(`${BASEURL}/api/v1/upload`, {
 method: "POST",
 credentials: "include",
 body: formData,
 });

 const data = await res.json().catch(() => ({}));

 if (res.ok) {
 setNewItem({ ...newItem, image: data.image });
 toast.success("Image uploaded to cloud! \u2601\uFE0F");
 } else {
 toast.error(data.message || "Upload failed");
 }
 } catch {
 toast.error("Network error during upload");
 } finally {
 setUploading(false);
 }
 };

 const handleAddVariant = () =>
 setNewItem({
 ...newItem,
 variants: [...(newItem.variants || []), { name: "", price: "" }],
 });

 const handleRemoveVariant = (index) =>
 setNewItem({
 ...newItem,
 variants: (newItem.variants || []).filter((_, i) => i !== index),
 });

 const handleVariantChange = (index, field, value) => {
 const updated = [...(newItem.variants || [])];
 if (index >= updated.length) return;
 updated[index][field] = value;
 setNewItem({ ...newItem, variants: updated });
 };

 const handleAddAddon = () =>
 setNewItem({
 ...newItem,
 addons: [...(newItem.addons || []), { name: "", price: "" }],
 });

 const handleRemoveAddon = (index) =>
 setNewItem({
 ...newItem,
 addons: (newItem.addons || []).filter((_, i) => i !== index),
 });

 const handleAddonChange = (index, field, value) => {
 const updated = [...(newItem.addons || [])];
 if (index >= updated.length) return;
 updated[index][field] = value;
 setNewItem({ ...newItem, addons: updated });
 };

 return (
 <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-[9999] p-2 sm:p-3 md:p-4 lg:p-6 animate-in fade-in duration-200">
  <div className="bg-gray-900 border border-gray-800 w-full max-w-lg sm:max-w-xl lg:max-w-3xl xl:max-w-4xl rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] p-4 sm:p-6 md:p-8 lg:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
  <button
  onClick={() => setShowModal(false)}
  className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 text-gray-500 hover:text-white bg-black/40 hover:bg-black/60 p-2 rounded-full transition-all hover:scale-110 z-10"
  >
  <X size={20} />
  </button>

  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter text-white mb-4 sm:mb-6 md:mb-8 border-l-4 border-primary pl-3 sm:pl-4">
  {isEditing ? "\u270F\uFE0F Edit Dish" : "\uD83C\uDF7D\uFE0F New Dish"}
  </h2>

  <form onSubmit={handleSubmitItem} className="space-y-4 sm:space-y-5 lg:space-y-6">
  {/* ==================== DESKTOP: 2-COLUMN LAYOUT ==================== */}
  <div className="lg:grid lg:grid-cols-5 lg:gap-6 xl:gap-8">
  {/* LEFT COLUMN — Form Fields */}
  <div className="lg:col-span-3 space-y-4 sm:space-y-5 lg:space-y-6">

  {/* Dish Name */}
  <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
  <label className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-500 uppercase tracking-widest pl-1">
  Dish Name
  </label>
  <input
  type="text"
  className="w-full bg-black border border-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 lg:p-5 text-sm sm:text-base text-white focus:border-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all uppercase font-bold placeholder-gray-700"
  placeholder="e.g. Maharaja Burger"
  value={newItem.name}
  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
  required
  />
  </div>

  {/* Price + Food Type Grid */}
  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
  <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
  <label className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-500 uppercase tracking-widest pl-1">
  Base Price
  </label>
  <div className="relative">
  <span className="absolute left-3 sm:left-3.5 md:left-4 lg:left-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm sm:text-base">₹</span>
  <input
  type="number"
  className="w-full bg-black border border-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 lg:p-5 pl-7 sm:pl-9 md:pl-10 lg:pl-12 text-sm sm:text-base text-white focus:border-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all font-black placeholder-gray-700"
  placeholder="e.g. 299"
  value={newItem.price}
  onChange={(e) =>
  setNewItem({ ...newItem, price: e.target.value })
  }
  required
  />
  </div>
  </div>

  <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
  <label className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-500 uppercase tracking-widest pl-1">
  Food Type
  </label>
  <select
  className="w-full bg-black border border-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 lg:p-5 text-xs sm:text-sm text-white focus:border-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all font-bold uppercase"
  value={newItem.isVeg}
  onChange={(e) =>
  setNewItem({ ...newItem, isVeg: e.target.value })
  }
  >
  <option value="true">🟢 Pure Veg</option>
  <option value="false">🔴 Non-Veg</option>
  </select>
  </div>
  </div>

  {/* Menu Category */}
  <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
  <label className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-500 uppercase tracking-widest pl-1">
  Menu Category
  </label>
  <input
  type="text"
  className="w-full bg-black border border-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 lg:p-5 text-sm sm:text-base text-white focus:border-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all uppercase font-bold placeholder-gray-700"
  placeholder="e.g. Starters, Main Course, Beverages"
  value={newItem.category}
  onChange={(e) =>
  setNewItem({ ...newItem, category: e.target.value })
  }
  required
  />
  </div>

  {/* Stock Quantity */}
  <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
  <label className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-500 uppercase tracking-widest pl-1">
  Stock Quantity
  </label>
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
  <input
  type="number"
  min="0"
  className="w-full sm:w-24 lg:w-28 bg-black border border-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 lg:p-5 text-sm sm:text-base text-white focus:border-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all font-black placeholder-gray-700"
  placeholder="0"
  value={newItem.countInStock ?? 0}
  onChange={(e) =>
  setNewItem({ ...newItem, countInStock: Math.max(0, parseInt(e.target.value) || 0) })
  }
  />
  <span className={`text-[10px] sm:text-[11px] font-bold ${newItem.countInStock > 0 ? "text-green-400" : "text-red-400"}`}>
  {newItem.countInStock > 0
  ? `\u2705 In stock (${newItem.countInStock})`
  : "\u274C Out of stock \u2014 increase stock above"}
  </span>
  </div>
  </div>

  <hr className="border-gray-800 my-1 sm:my-2" />

  {/* Description */}
  <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
  <div className="flex justify-between items-end">
  <label className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-500 uppercase tracking-widest pl-1">
  Description
  </label>
  <span className={`text-[10px] sm:text-[11px] font-bold tabular-nums ${descLen >= 500 ? "text-red-400" : "text-gray-600"}`}>
  {descLen}/500
  </span>
  </div>
  <textarea
  rows="3"
  maxLength={500}
  className="w-full bg-black border border-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 lg:p-5 text-sm sm:text-base text-white focus:border-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium placeholder-gray-700 resize-none"
  placeholder="Describe ingredients, taste, serving size..."
  value={newItem.description}
  onChange={(e) =>
  setNewItem({ ...newItem, description: e.target.value })
  }
  required
  ></textarea>
  </div>
  </div>

  {/* RIGHT COLUMN — Image (Desktop) */}
  <div className="lg:col-span-2 lg:space-y-4">
  {/* Image Upload & URL */}
  <div className="space-y-3">
  <label className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-500 uppercase tracking-widest pl-1">
  Dish Image
  </label>
  <div className="flex gap-2 mb-2">
  <button
  type="button"
  onClick={() => setImageMode("url")}
  className={`flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all ${
  imageMode === "url"
  ? "bg-black text-white shadow-sm border border-gray-700"
  : "bg-gray-800 text-gray-400 hover:text-white border border-transparent"
  }`}
  >
  <LinkIcon size={12} className="inline mr-1" /> URL
  </button>
  <button
  type="button"
  onClick={() => setImageMode("upload")}
  className={`flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all ${
  imageMode === "upload"
  ? "bg-black text-white shadow-sm border border-gray-700"
  : "bg-gray-800 text-gray-400 hover:text-white border border-transparent"
  }`}
  >
  <Upload size={12} className="inline mr-1" /> Upload
  </button>
  </div>

  {/* Preview — larger on desktop */}
  {newItem.image ? (
  <div className="w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-gray-800 shadow-xl bg-black/40">
  <img
  src={newItem.image}
  alt="preview"
  className="w-full h-full object-cover"
  onError={(e) => {
  e.target.src =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E";
  e.target.className = "w-full h-full object-contain p-8 opacity-50";
  }}
  />
  </div>
  ) : (
  <div className="w-full aspect-video rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-800 bg-black/20 flex flex-col items-center justify-center gap-2">
  <span className="text-gray-700">
  {imageMode === "url" ? <LinkIcon size={24} /> : <Upload size={24} />}
  </span>
  <span className="text-[10px] sm:text-xs text-gray-700 font-bold uppercase tracking-wider">No image</span>
  <span className="text-[8px] sm:text-[9px] text-gray-800">
  {imageMode === "url" ? "Paste a URL below" : "Choose a file below"}
  </span>
  </div>
  )}

  {/* Input area below preview */}
  {imageMode === "url" ? (
  <div className="relative group">
  <LinkIcon
  className="absolute left-3 sm:left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors"
  size={16}
  />
  <input
  type="text"
  placeholder="Paste image link..."
  className="w-full bg-black border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 md:p-4 pl-9 sm:pl-10 md:pl-12 text-sm text-white focus:border-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono placeholder-gray-700"
  value={newItem.image}
  onChange={(e) =>
  setNewItem({ ...newItem, image: e.target.value })
  }
  />
  </div>
  ) : (
  <div className="relative group w-full">
  <input
  type="file"
  onChange={uploadFileHandler}
  accept="image/png,image/jpeg,image/webp,image/gif"
  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
  />
  <div className="w-full bg-black border border-dashed border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 md:p-4 text-xs text-gray-500 flex items-center justify-center gap-2 group-hover:border-primary group-hover:text-primary transition-all">
  {uploading ? (
  <Loader2 size={16} className="animate-spin text-primary" />
  ) : (
  <Upload size={16} />
  )}
  {newItem.image ? "Change image" : "Choose image"}
  </div>
  <p className="text-[8px] sm:text-[9px] text-gray-700 mt-1.5">PNG, JPG, WebP — max 5MB</p>
  </div>
  )}
  </div>
  </div>
  </div>

  <hr className="border-gray-800" />

  {/* Variants Section */}
  <div className="bg-black/30 sm:bg-black/40 p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-800 space-y-2 sm:space-y-3 lg:space-y-4">
  <div className="flex justify-between items-center">
  <h4 className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-400 uppercase flex items-center gap-2 tracking-[0.2em]">
  <Layers size={14} className="text-primary shrink-0" /> Size Variants
  </h4>
  <button
  type="button"
  onClick={handleAddVariant}
  className="text-[10px] sm:text-[11px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-full uppercase hover:bg-primary/20 transition-colors"
  >
  + Add
  </button>
  </div>
  {(!newItem.variants || newItem.variants.length === 0) && (
  <p className="text-[10px] sm:text-[11px] text-gray-700 text-center py-2 sm:py-3 font-medium">No variants added. Tap &ldquo;+ Add&rdquo; to create size options.</p>
  )}
  {newItem.variants && newItem.variants.map((v, i) => (
  <div
  key={i}
  className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 animate-in slide-in-from-right-2 duration-300"
  >
  <input
  type="text"
  placeholder="Small / Half"
  className="flex-1 min-w-[80px] sm:min-w-[100px] bg-gray-900 border border-gray-800 rounded-xl p-2 sm:p-2.5 md:p-3 text-xs sm:text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
  value={v.name}
  onChange={(e) =>
  handleVariantChange(i, "name", e.target.value)
  }
  required
  />
  <div className="relative w-full sm:w-20 lg:w-24 shrink-0">
  <span className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
  <input
  type="number"
  placeholder="Price"
  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2 sm:p-2.5 md:p-3 pl-5 sm:pl-6 text-xs sm:text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
  value={v.price}
  onChange={(e) =>
  handleVariantChange(i, "price", e.target.value)
  }
  required
  />
  </div>
  <button
  type="button"
  onClick={() => handleRemoveVariant(i)}
  className="shrink-0 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all self-center"
  >
  <Trash2 className="size-3.5 sm:size-4 md:size-[18px] shrink-0" />
  </button>
  </div>
  ))}
  </div>

  {/* Add-ons Section */}
  <div className="bg-black/30 sm:bg-black/40 p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-800 space-y-2 sm:space-y-3 lg:space-y-4">
  <div className="flex justify-between items-center">
  <h4 className="text-[10px] sm:text-[11px] lg:text-xs font-black text-gray-400 uppercase flex items-center gap-2 tracking-[0.2em]">
  <PlusCircle size={14} className="text-green-500 shrink-0" /> Add-ons &amp;
  Extras
  </h4>
  <button
  type="button"
  onClick={handleAddAddon}
  className="text-[10px] sm:text-[11px] font-black bg-green-500/10 text-green-500 px-3 py-1.5 rounded-full uppercase hover:bg-green-500/20 transition-colors"
  >
  + Add
  </button>
  </div>
  {(!newItem.addons || newItem.addons.length === 0) && (
  <p className="text-[10px] sm:text-[11px] text-gray-700 text-center py-2 sm:py-3 font-medium">No add-ons yet. Tap &ldquo;+ Add&rdquo; to add extras.</p>
  )}
  {newItem.addons && newItem.addons.map((a, i) => (
  <div
  key={i}
  className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 animate-in slide-in-from-right-2 duration-300"
  >
  <input
  type="text"
  placeholder="Extra Cheese"
  className="flex-1 min-w-[80px] sm:min-w-[100px] bg-gray-900 border border-gray-800 rounded-xl p-2 sm:p-2.5 md:p-3 text-xs sm:text-sm text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-all"
  value={a.name}
  onChange={(e) => handleAddonChange(i, "name", e.target.value)}
  required
  />
  <div className="relative w-full sm:w-20 lg:w-24 shrink-0">
  <span className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
  <input
  type="number"
  placeholder="Price"
  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2 sm:p-2.5 md:p-3 pl-5 sm:pl-6 text-xs sm:text-sm text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-all"
  value={a.price}
  onChange={(e) =>
  handleAddonChange(i, "price", e.target.value)
  }
  required
  />
  </div>
  <button
  type="button"
  onClick={() => handleRemoveAddon(i)}
  className="shrink-0 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all self-center"
  >
  <Trash2 className="size-3.5 sm:size-4 md:size-[18px] shrink-0" />
  </button>
  </div>
  ))}
  </div>

  {/* Submit Button */}
  <button
  type="submit"
  disabled={uploading}
  className={`w-full font-black py-3.5 sm:py-4 lg:py-5 rounded-xl sm:rounded-2xl transition-all uppercase text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] shadow-xl active:scale-[0.98] ${
  uploading
  ? "bg-gray-800 text-gray-600 cursor-not-allowed"
  : "bg-primary hover:bg-red-600 text-white shadow-primary/20"
  }`}
  >
  {uploading ? (
  <span className="flex items-center justify-center gap-2">
  <Loader2 size={16} className="animate-spin" /> Uploading...
  </span>
  ) : isEditing
  ? "\uD83D\uDCBE Save Dish"
  : "\uD83C\uDF7D\uFE0F Create Dish"}
  </button>
  </form>
  </div>
  </div>
 );
};

export default ItemModal;
