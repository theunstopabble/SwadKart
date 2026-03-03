import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Plus, Trash2, Layers, Tag } from "lucide-react";
import { BASE_URL } from "../../config";
import MenuHeader from "./MenuHeader";
import MenuItemCard from "./MenuItemCard";
import { optimizeImageUrl } from "../../utils/imageOptimizer";

const MenuTab = ({ restaurants, userInfo }) => {
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

  // ✅ FIX 1: Filter wapas laga diya. Ab sirf 'Owners' dikhenge.
  // Normal users dropdown se hat jayenge.
  const shopOwners =
    restaurants?.filter((r) => r.role === "restaurant_owner") || [];

  const getFetchOptions = (method = "GET", body = null) => ({
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userInfo?.token}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  // --- Fetch Menu ---
  const fetchMenu = async () => {
    if (!selectedRestaurant) return;
    try {
      // Backend Owner ID se menu fetch kar lega
      const res = await fetch(
        `${BASE_URL}/api/v1/products/restaurant/${selectedRestaurant}`,
        getFetchOptions(),
      );
      const data = await res.json();
      setMenuItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Sync error");
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [selectedRestaurant]);

  // --- Actions ---
  const handleAdminToggleStock = async (id) => {
    const res = await fetch(
      `${BASE_URL}/api/v1/products/${id}/toggle-stock`,
      getFetchOptions("PATCH"),
    );
    if (res.ok) {
      fetchMenu();
      toast.success("Status Toggled");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Destroy this menu item?")) return;
    const res = await fetch(
      `${BASE_URL}/api/v1/products/${id}`,
      getFetchOptions("DELETE"),
    );
    if (res.ok) {
      fetchMenu();
      toast.success("Item Deleted");
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    const url = isEditingItem
      ? `${BASE_URL}/api/v1/products/${editItemId}`
      : `${BASE_URL}/api/v1/products`;

    // ✅ FIX 2: Backend ko "Owner ID" chahiye.
    // 'selectedRestaurant' mein Owner ki ID hai, wahi bhej rahe hain.
    const payload = {
      ...newItem,
      image: optimizeImageUrl(newItem.image), // Compress image URL before DB save
      price: Number(newItem.price),
      isVeg: newItem.isVeg === "true",
      restaurantId: selectedRestaurant, // Backend check karega: findOne({ owner: restaurantId })
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
      const err = await res.json();
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
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
            <div className="col-span-full text-center py-20 text-gray-500 font-bold uppercase tracking-widest bg-gray-900/20 rounded-3xl">
              No items found for this merchant
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-32 bg-gray-950 rounded-[4rem] border-2 border-dashed border-gray-900 mt-10">
          <p className="text-gray-700 font-black uppercase italic tracking-[0.4em]">
            Initialize merchant to view inventory
          </p>
        </div>
      )}

      {/* 📂 ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex justify-center items-center z-[9999] p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-gray-950 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-2xl relative border border-gray-900 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <button
              onClick={() => setShowItemModal(false)}
              className="absolute top-6 right-6 text-gray-700 hover:text-white transition-all bg-gray-900 p-2 rounded-full"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase text-white mb-8 border-l-8 border-primary pl-6 leading-none">
              {isEditingItem ? "Modify" : "Deploy"}{" "}
              <span className="text-primary">Dish</span>
            </h2>
            <form onSubmit={handleSubmitItem} className="space-y-6">
              <input
                type="text"
                placeholder="Dish Name"
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary transition-all"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                required
              />
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="number"
                  placeholder="Base Price"
                  className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary transition-all"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: e.target.value })
                  }
                  required
                />
                <select
                  className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white font-black uppercase text-xs outline-none focus:border-primary transition-all"
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
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary transition-all"
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Description..."
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-medium outline-none focus:border-primary h-24 transition-all"
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Asset URL (Image)"
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-primary transition-all"
                value={newItem.image}
                onChange={(e) =>
                  setNewItem({ ...newItem, image: e.target.value })
                }
              />

              {/* VARIANTS */}
              <div className="bg-black/50 p-6 rounded-3xl border border-gray-900 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={14} /> Variants (Sizes)
                  </h3>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="text-primary font-black text-[10px] uppercase flex items-center gap-1 hover:underline transition-all"
                  >
                    <Plus size={14} /> Add Variant
                  </button>
                </div>
                {newItem.variants.map((v, i) => (
                  <div
                    key={i}
                    className="flex gap-2 animate-in slide-in-from-right-2 duration-300"
                  >
                    <input
                      type="text"
                      placeholder="Name (e.g. Small)"
                      className="flex-1 bg-gray-900 border border-gray-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
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
                      className="w-24 bg-gray-900 border border-gray-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
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
                      className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ADDONS */}
              <div className="bg-black/50 p-6 rounded-3xl border border-gray-900 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Tag size={14} /> Add-ons (Extras)
                  </h3>
                  <button
                    type="button"
                    onClick={addAddon}
                    className="text-primary font-black text-[10px] uppercase flex items-center gap-1 hover:underline transition-all"
                  >
                    <Plus size={14} /> Add Addon
                  </button>
                </div>
                {newItem.addons.map((v, i) => (
                  <div
                    key={i}
                    className="flex gap-2 animate-in slide-in-from-right-2 duration-300"
                  >
                    <input
                      type="text"
                      placeholder="Name (e.g. Cheese)"
                      className="flex-1 bg-gray-900 border border-gray-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
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
                      className="w-24 bg-gray-900 border border-gray-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
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
                      className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.3em] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
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
