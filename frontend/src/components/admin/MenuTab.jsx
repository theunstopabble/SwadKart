import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Plus, Trash2, Layers, Tag, UtensilsCrossed } from "lucide-react";
import { BASEURL } from "../../config";
import MenuHeader from "./MenuHeader";
import MenuItemCard from "./MenuItemCard";
import { optimizeImageUrl } from "../../utils/imageOptimizer";

const MenuTab = ({ restaurants }) => {
 const [selectedRestaurant, setSelectedRestaurant] = useState("");
 const [menuItems, setMenuItems] = useState([]);
 const [showItemModal, setShowItemModal] = useState(false);
 const [isEditingItem, setIsEditingItem] = useState(false);
 const [editItemId, setEditItemId] = useState(null);

 const [newItem, setNewItem] = useState({
 name: "",
 price: "",
 description: "",
 category: "",
 image: "",
 isVeg: "true",
 variants: [],
 addons: [],
 });

 // ✅ FIX: restaurants are Restaurant documents (not User docs), no 'role' field
 // Show all restaurants from admin endpoint
 const shopOwners = restaurants || [];

 const getFetchOptions = (method = "GET", body = null) => ({
 method,
 credentials: "include",
 headers: {
 "Content-Type": "application/json",
 },
 body: body ? JSON.stringify(body) : null,
 });

  // --- Fetch Menu ---
  const fetchMenu = async () => {
  if (!selectedRestaurant) return;
  setMenuItems([]);
  try {
  // Backend Owner ID se menu fetch kar lega
  const res = await fetch(
  `${BASEURL}/api/v1/products/restaurant/${selectedRestaurant}`,
  { ...getFetchOptions(), cache: "no-store" },
  );
  const data = await res.json();
 setMenuItems(Array.isArray(data) ? data : []);
 } catch {
 toast.error("Sync error");
 }
 };

 useEffect(() => {
 fetchMenu();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [selectedRestaurant]);

 // --- Actions ---
 const handleAdminToggleStock = async (id) => {
 try {
 const res = await fetch(
 `${BASEURL}/api/v1/products/${id}/toggle-stock`,
 getFetchOptions("PATCH"),
 );
 if (res.ok) {
 fetchMenu();
 toast.success("Status Toggled");
 } else {
 toast.error("Failed to toggle stock status");
 }
 } catch {
 toast.error("Network error toggling stock");
 }
 };

 const handleDeleteItem = async (id) => {
 if (!window.confirm("Destroy this menu item?")) return;
 try {
 const res = await fetch(
 `${BASEURL}/api/v1/products/${id}`,
 getFetchOptions("DELETE"),
 );
 if (res.ok) {
 fetchMenu();
 toast.success("Item Deleted");
 } else {
 toast.error("Failed to delete item");
 }
 } catch {
 toast.error("Network error deleting item");
 }
 };

 const handleSubmitItem = async (e) => {
 e.preventDefault();
 const selectedRestaurantObj = shopOwners.find(
 (r) => r._id === selectedRestaurant,
 );
 const url = isEditingItem
 ? `${BASEURL}/api/v1/products/${editItemId}`
 : `${BASEURL}/api/v1/products`;

 // Backend expects the Owner User ID as 'restaurantId' for product creation
 // Priority: populated owner._id > raw owner ObjectId > restaurant _id as last resort
 const ownerId = selectedRestaurantObj?.owner?._id
 || selectedRestaurantObj?.owner
 || selectedRestaurant;

 const payload = {
 ...newItem,
 image: optimizeImageUrl(newItem.image), // Compress image URL before DB save
 price: Number(newItem.price),
 isVeg: newItem.isVeg === "true",
 restaurantId: ownerId,
 variants: newItem.variants.map((v) => ({ ...v, price: Number(v.price) })),
 addons: newItem.addons.map((a) => ({ ...a, price: Number(a.price) })),
 };

 console.log("🚀 Payload Sending:", payload);

 const res = await fetch(
 url,
 getFetchOptions(isEditingItem ? "PUT" : "POST", payload),
 );

 if (res.ok) {
 setShowItemModal(false);
 fetchMenu();
 toast.success("Menu Synchronized! 🍔");
 } else {
 const err = await res.json().catch(() => ({}));
 // Error message example: "No Restaurant found for this owner"
 toast.error(err.message || "Operation Failed");
 }
 };

 // --- Form Helpers ---
 const addVariant = () =>
 setNewItem({
 ...newItem,
 variants: [...newItem.variants, { name: "", price: "" }],
 });

 const addAddon = () =>
 setNewItem({
 ...newItem,
 addons: [...newItem.addons, { name: "", price: "" }],
 });

  // ADMIN-06 FIX: Show skeleton loading while restaurant data is still being fetched
  if (!restaurants || restaurants.length === 0) {
  return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 animate-pulse">
  {Array.from({ length: 3 }).map((_, i) => (
  <div key={i} className="bg-gray-950 border border-gray-900 rounded-2xl sm:rounded-[2.5rem] overflow-hidden">
  <div className="h-40 sm:h-48 bg-gray-900" />
  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
  <div className="h-5 sm:h-6 bg-gray-900 rounded w-3/4" />
  <div className="h-3 sm:h-4 bg-gray-900 rounded w-1/2" />
  <div className="flex gap-2 sm:gap-3 pt-1">
  <div className="flex-1 h-8 sm:h-10 bg-gray-900 rounded-xl" />
  <div className="flex-1 h-8 sm:h-10 bg-gray-900 rounded-xl" />
  </div>
  </div>
  </div>
  ))}
  </div>
  );
  }

  return (
  <div className="animate-in fade-in duration-700 pb-20 px-4 md:px-0">
  {/* ✅ Header mein ab filtered 'shopOwners' jayenge */}
  <MenuHeader
  restaurants={shopOwners}
  selectedRestaurant={selectedRestaurant}
  setSelectedRestaurant={setSelectedRestaurant}
  openAddItemModal={() => {
  if (!selectedRestaurant)
  return toast.error("Select a merchant first!");
  setIsEditingItem(false);
  setNewItem({
  name: "",
  price: "",
  description: "",
  category: "",
  image: "",
  isVeg: "true",
  variants: [],
  addons: [],
  });
  setShowItemModal(true);
  }}
  />

  {selectedRestaurant ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mt-8 sm:mt-10">
  {menuItems.map((item) => (
  <MenuItemCard
  key={item._id}
  item={item}
  onToggleStock={handleAdminToggleStock}
  onEdit={(i) => {
  setIsEditingItem(true);
  setEditItemId(i._id);
  setNewItem({
  ...i,
  isVeg: i.isVeg ? "true" : "false",
  variants: i.variants || [],
  addons: i.addons || [],
  });
  setShowItemModal(true);
  }}
  onDelete={handleDeleteItem}
  />
  ))}
  {menuItems.length === 0 && (
  <div className="col-span-full text-center py-16 sm:py-20 text-gray-500 font-bold uppercase tracking-widest bg-gray-950 border-2 border-dashed border-gray-900 rounded-2xl sm:rounded-3xl">
  <UtensilsCrossed size={40} className="mx-auto text-gray-800 mb-4" />
  <p>No items found for this merchant</p>
  </div>
  )}
  </div>
  ) : (
  <div className="text-center py-20 sm:py-32 bg-gray-950 rounded-2xl sm:rounded-[4rem] border-2 border-dashed border-gray-900 mt-8 sm:mt-10">
  <UtensilsCrossed size={48} className="mx-auto text-gray-800 mb-6" />
  <p className="text-gray-700 font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-xs sm:text-sm">
  Initialize merchant to view inventory
  </p>
  </div>
  )}

  {/* 📂 ITEM MODAL */}
  {showItemModal && (
  <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex justify-center items-center z-[9999] p-3 sm:p-6 animate-in zoom-in-95 duration-300">
  <div className="bg-gray-950 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-sm sm:max-w-xl md:max-w-2xl relative border border-gray-900 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
  <button
  onClick={() => setShowItemModal(false)}
  className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-700 hover:text-white transition-all bg-gray-900 p-2 rounded-full"
  >
  <X size={16} />
  </button>
  <h2 className="text-lg sm:text-2xl md:text-3xl font-black uppercase text-white mb-6 sm:mb-8 border-l-6 sm:border-l-8 border-primary pl-4 sm:pl-6 leading-none">
  {isEditingItem ? "Modify" : "Deploy"}{" "}
  <span className="text-primary">Dish</span>
  </h2>
  <form onSubmit={handleSubmitItem} className="space-y-3 sm:space-y-4 md:space-y-6">
  <input
  type="text"
  placeholder="Dish Name"
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary transition-all"
  value={newItem.name}
  onChange={(e) =>
  setNewItem({ ...newItem, name: e.target.value })
  }
  required
  />
  <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
  <input
  type="number"
  placeholder="Base Price"
  className="flex-1 bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary transition-all"
  value={newItem.price}
  onChange={(e) =>
  setNewItem({ ...newItem, price: e.target.value })
  }
  required
  />
  <select
  className="flex-1 bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white font-black uppercase text-[10px] sm:text-xs outline-none focus:border-primary transition-all"
  value={newItem.isVeg}
  onChange={(e) =>
  setNewItem({ ...newItem, isVeg: e.target.value })
  }
  >
  <option value="true">Veg Protocol</option>
  <option value="false">Non-Veg</option>
  </select>
  </div>
  <input
  type="text"
  placeholder="Category (e.g. Burgers)"
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary transition-all"
  value={newItem.category}
  onChange={(e) =>
  setNewItem({ ...newItem, category: e.target.value })
  }
  required
  />
  <textarea
  placeholder="Description..."
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-medium outline-none focus:border-primary h-20 sm:h-24 transition-all"
  value={newItem.description}
  onChange={(e) =>
  setNewItem({ ...newItem, description: e.target.value })
  }
  required
  />
  <input
  type="text"
  placeholder="Asset URL (Image)"
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white outline-none focus:border-primary transition-all"
  value={newItem.image}
  onChange={(e) =>
  setNewItem({ ...newItem, image: e.target.value })
  }
  />

  {/* VARIANTS */}
  <div className="bg-black/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-900 space-y-3 sm:space-y-4">
  <div className="flex justify-between items-center">
  <h3 className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
  <Layers size={12} /> Variants (Sizes)
  </h3>
  <button
  type="button"
  onClick={addVariant}
  className="text-primary font-black text-[9px] sm:text-[10px] uppercase flex items-center gap-1 hover:underline transition-all"
  >
  <Plus size={12} /> Add Variant
  </button>
  </div>
  {newItem.variants.map((v, i) => (
  <div
  key={i}
  className="flex gap-1.5 sm:gap-2 animate-in slide-in-from-right-2 duration-300"
  >
  <input
  type="text"
  placeholder="Name (e.g. Small)"
  className="flex-1 bg-gray-900 border border-gray-800 p-2 sm:p-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-white outline-none focus:border-primary"
  value={v.name}
  onChange={(e) => {
  let x = [...newItem.variants];
  x[i].name = e.target.value;
  setNewItem({ ...newItem, variants: x });
  }}
  />
  <input
  type="number"
  placeholder="Price"
  className="w-20 sm:w-24 bg-gray-900 border border-gray-800 p-2 sm:p-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-white outline-none focus:border-primary"
  value={v.price}
  onChange={(e) => {
  let x = [...newItem.variants];
  x[i].price = e.target.value;
  setNewItem({ ...newItem, variants: x });
  }}
  />
  <button
  type="button"
  onClick={() =>
  setNewItem({
  ...newItem,
  variants: newItem.variants.filter(
  (_, idx) => idx !== i,
  ),
  })
  }
  className="text-red-500 p-1.5 sm:p-2 hover:bg-red-500/10 rounded-lg transition-all"
  >
  <Trash2 size={14} />
  </button>
  </div>
  ))}
  </div>

  {/* ADDONS */}
  <div className="bg-black/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-900 space-y-3 sm:space-y-4">
  <div className="flex justify-between items-center">
  <h3 className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
  <Tag size={12} /> Add-ons (Extras)
  </h3>
  <button
  type="button"
  onClick={addAddon}
  className="text-primary font-black text-[9px] sm:text-[10px] uppercase flex items-center gap-1 hover:underline transition-all"
  >
  <Plus size={12} /> Add Addon
  </button>
  </div>
  {newItem.addons.map((v, i) => (
  <div
  key={i}
  className="flex gap-1.5 sm:gap-2 animate-in slide-in-from-right-2 duration-300"
  >
  <input
  type="text"
  placeholder="Name (e.g. Cheese)"
  className="flex-1 bg-gray-900 border border-gray-800 p-2 sm:p-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-white outline-none focus:border-primary"
  value={v.name}
  onChange={(e) => {
  let x = [...newItem.addons];
  x[i].name = e.target.value;
  setNewItem({ ...newItem, addons: x });
  }}
  />
  <input
  type="number"
  placeholder="Price"
  className="w-20 sm:w-24 bg-gray-900 border border-gray-800 p-2 sm:p-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-white outline-none focus:border-primary"
  value={v.price}
  onChange={(e) => {
  let x = [...newItem.addons];
  x[i].price = e.target.value;
  setNewItem({ ...newItem, addons: x });
  }}
  />
  <button
  type="button"
  onClick={() =>
  setNewItem({
  ...newItem,
  addons: newItem.addons.filter((_, idx) => idx !== i),
  })
  }
  className="text-red-500 p-1.5 sm:p-2 hover:bg-red-500/10 rounded-lg transition-all"
  >
  <Trash2 size={14} />
  </button>
  </div>
  ))}
  </div>

  <button
  type="submit"
  className="w-full bg-primary text-white font-black py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
  >
  Commit to Inventory
  </button>
  </form>
  </div>
  </div>
  )}
 </div>
 );
};

export default MenuTab;
