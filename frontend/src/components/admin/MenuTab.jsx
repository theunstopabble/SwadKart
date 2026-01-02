import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { BASE_URL } from "../../config";
import MenuHeader from "./MenuHeader";
import MenuItemCard from "./MenuItemCard";

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

  const getFetchOptions = (method = "GET", body = null) => ({
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userInfo?.token}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  const fetchMenu = async () => {
    if (!selectedRestaurant) return;
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/products/restaurant/${selectedRestaurant}`,
        getFetchOptions()
      );
      setMenuItems(await res.json());
    } catch (e) {
      toast.error("Sync error");
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [selectedRestaurant]);

  const handleAdminToggleStock = async (id) => {
    const res = await fetch(
      `${BASE_URL}/api/v1/products/${id}/toggle-stock`,
      getFetchOptions("PATCH")
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
      getFetchOptions("DELETE")
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
    const res = await fetch(
      url,
      getFetchOptions(isEditingItem ? "PUT" : "POST", {
        ...newItem,
        isVeg: newItem.isVeg === "true",
        restaurantId: selectedRestaurant,
      })
    );
    if (res.ok) {
      setShowItemModal(false);
      fetchMenu();
      toast.success("Menu Synchronized!");
    }
  };

  // Variants/Addons Handlers
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
    <div className="animate-in fade-in duration-700 pb-20">
      <MenuHeader
        restaurants={restaurants}
        selectedRestaurant={selectedRestaurant}
        setSelectedRestaurant={setSelectedRestaurant}
        openAddItemModal={() => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems.map((item) => (
            <MenuItemCard
              key={item._id}
              item={item}
              onToggleStock={handleAdminToggleStock}
              onEdit={(i) => {
                setIsEditingItem(true);
                setEditItemId(i._id);
                setNewItem({ ...i, isVeg: i.isVeg ? "true" : "false" });
                setShowItemModal(true);
              }}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-gray-950 rounded-[4rem] border-2 border-dashed border-gray-900">
          <p className="text-gray-700 font-black uppercase italic tracking-[0.4em]">
            Initialize merchant to view inventory
          </p>
        </div>
      )}

      {/* 📂 ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex justify-center items-center z-[9999] p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-gray-950 p-10 rounded-[3.5rem] w-full max-w-xl relative border border-gray-900 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <button
              onClick={() => setShowItemModal(false)}
              className="absolute top-8 right-8 text-gray-700 hover:text-white transition-all bg-gray-900 p-2 rounded-full"
            >
              <X size={20} />
            </button>
            <h2 className="text-3xl font-black italic uppercase text-white mb-8 border-l-8 border-primary pl-6 leading-none">
              {isEditingItem ? "Modify" : "Deploy"}{" "}
              <span className="text-primary">Dish</span>
            </h2>
            <form onSubmit={handleSubmitItem} className="space-y-6">
              <input
                type="text"
                placeholder="Dish Name"
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                required
              />
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Price"
                  className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: e.target.value })
                  }
                  required
                />
                <select
                  className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white font-black uppercase text-xs outline-none focus:border-primary"
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
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Description..."
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-medium outline-none focus:border-primary h-24"
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Asset URL (Image)"
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-primary"
                value={newItem.image}
                onChange={(e) =>
                  setNewItem({ ...newItem, image: e.target.value })
                }
              />

              {/* Variants Section */}
              <div className="bg-black/50 p-6 rounded-3xl border border-gray-900 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Variants (Sizes)
                  </h3>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="text-primary font-black text-[10px] uppercase flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Add Variant
                  </button>
                </div>
                {newItem.variants.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      className="flex-1 bg-gray-900 border border-gray-800 p-3 rounded-xl text-xs"
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
                      className="w-24 bg-gray-900 border border-gray-800 p-3 rounded-xl text-xs"
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
                            (_, idx) => idx !== i
                          ),
                        })
                      }
                      className="text-red-500 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full bg-primary font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.3em] shadow-2xl shadow-primary/30 active:scale-95"
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
