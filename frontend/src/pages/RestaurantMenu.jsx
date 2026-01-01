import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import io from "socket.io-client"; // 👈 1. Import Socket
import {
  Star,
  MapPin,
  Clock,
  Plus,
  Search,
  UtensilsCrossed,
  X,
  Check,
  ChevronRight,
  AlertCircle, // 👈 Import Icon
} from "lucide-react";
import { BASE_URL } from "../config";

const RestaurantMenu = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);

  // --- DATA STATES ---
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [filteredMenu, setFilteredMenu] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // --- CUSTOMIZATION MODAL STATES ---
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [finalPrice, setFinalPrice] = useState(0);

  // 1. FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [restaurantRes, menuRes] = await Promise.all([
          fetch(`${BASE_URL}/api/v1/users/${id}`),
          fetch(`${BASE_URL}/api/v1/products/restaurant/${id}`),
        ]);

        if (!restaurantRes.ok) throw new Error("Restaurant not found");

        const restaurantData = await restaurantRes.json();
        const menuData = await menuRes.json();

        setRestaurant(restaurantData.data || restaurantData);

        let finalMenu = [];
        if (Array.isArray(menuData)) {
          finalMenu = menuData;
        } else if (menuData.products) {
          finalMenu = menuData.products;
        }
        setMenu(finalMenu);
        // Initial filtering happens in the next useEffect automatically
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 📡 2. SOCKET.IO LIVE UPDATES (The Magic Fix)
  useEffect(() => {
    // Connect to Backend
    const socket = io(BASE_URL);

    // Listen for Stock Changes
    socket.on("productUpdated", (updatedItem) => {
      console.log(
        "⚡ Live Update:",
        updatedItem.name,
        "Stock:",
        updatedItem.countInStock
      );

      // Update State Immediately
      setMenu((prevMenu) =>
        prevMenu.map((item) =>
          item._id === updatedItem._id ? { ...item, ...updatedItem } : item
        )
      );
    });

    // Cleanup
    return () => socket.disconnect();
  }, []);

  // 3. SEARCH LOGIC (Runs when 'searchTerm' OR 'menu' changes)
  useEffect(() => {
    const results = menu.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMenu(results);
  }, [searchTerm, menu]);

  // 4. PRICE CALCULATION ENGINE
  useEffect(() => {
    if (!selectedItem) return;

    let price = selectedItem.price;
    if (selectedVariant) {
      price = selectedVariant.price;
    }
    if (selectedAddons.length > 0) {
      const addonsTotal = selectedAddons.reduce(
        (acc, addon) => acc + addon.price,
        0
      );
      price += addonsTotal;
    }
    setFinalPrice(price);
  }, [selectedVariant, selectedAddons, selectedItem]);

  // 5. HANDLERS
  const handleAddToCartClick = (item) => {
    // 🛑 Block if Sold Out
    if (item.countInStock === 0) return;

    if (!userInfo) {
      alert("Please Login to order food! 🍔");
      navigate("/login");
      return;
    }

    const hasVariants = item.variants && item.variants.length > 0;
    const hasAddons = item.addons && item.addons.length > 0;

    if (hasVariants || hasAddons) {
      setSelectedItem(item);
      if (hasVariants) {
        setSelectedVariant(item.variants[0]);
      } else {
        setSelectedVariant(null);
      }
      setSelectedAddons([]);
      setShowModal(true);
    } else {
      dispatch(addToCart({ ...item, qty: 1 }));
      alert(`${item.name} added to cart! 🛒`);
    }
  };

  const toggleAddon = (addon) => {
    if (selectedAddons.some((a) => a._id === addon._id)) {
      setSelectedAddons(selectedAddons.filter((a) => a._id !== addon._id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const confirmCustomization = () => {
    if (!selectedItem) return;

    const cartItem = {
      ...selectedItem,
      price: finalPrice,
      selectedVariant: selectedVariant,
      selectedAddons: selectedAddons,
      qty: 1,
      _id:
        selectedItem._id +
        (selectedVariant ? "-" + selectedVariant.name : "") +
        (selectedAddons.length > 0 ? "-custom" : ""),
    };

    dispatch(addToCart(cartItem));
    setShowModal(false);
    alert("Item added with customization! 😋");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="animate-pulse text-xl font-bold text-primary">
          Loading Delicious Menu... 🍕
        </div>
      </div>
    );

  return (
    <div className="bg-black min-h-screen text-white pb-20 pt-16">
      {/* Banner Section */}
      {restaurant && (
        <div className="relative h-72 w-full">
          <img
            src={
              restaurant.image ||
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80"
            }
            alt={restaurant.name}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-8 max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-2 tracking-tight text-white shadow-lg">
              {restaurant.name}
            </h1>
            <p className="text-gray-300 text-lg flex items-center gap-4">
              <span className="bg-green-600 px-2 py-0.5 rounded text-sm font-bold flex items-center gap-1">
                <Star size={12} fill="currentColor" />{" "}
                {restaurant.rating || "4.5"}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={16} /> {restaurant.location || "Jaipur"}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={16} /> 30-40 mins
              </span>
            </p>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="relative group max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search for dishes (e.g. Pizza, Paneer)..."
            className="w-full bg-gray-900 border border-gray-800 text-white pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-medium placeholder:text-gray-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Menu Items{" "}
            <span className="text-sm bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
              {filteredMenu.length}
            </span>
          </h2>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-primary text-sm font-bold hover:underline"
            >
              Clear Search
            </button>
          )}
        </div>

        {filteredMenu.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-gray-800 border-dashed">
            <UtensilsCrossed className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-400 text-xl font-bold">
              Oops! No dishes match your search. 🍛
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((item) => {
              // 👇 CHECK STOCK STATUS
              const isOutOfStock = item.countInStock === 0;

              return (
                <div
                  key={item._id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 group flex flex-col animate-in fade-in zoom-in-95 duration-300"
                >
                  {/* Image Area */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={
                        item.image ||
                        "https://placehold.co/600x400?text=No+Image"
                      }
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        isOutOfStock
                          ? "grayscale opacity-40 scale-100" // Grayscale if OOS
                          : "group-hover:scale-110"
                      }`}
                    />

                    {/* 🚫 SOLD OUT OVERLAY */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-[2px]">
                        <AlertCircle className="text-red-500 mb-1" size={32} />
                        <span className="text-red-500 font-black text-xl border-2 border-red-500 px-3 py-1 uppercase tracking-widest shadow-xl -rotate-12">
                          SOLD OUT
                        </span>
                      </div>
                    )}

                    {/* Veg/Non-Veg Badge */}
                    <span
                      className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded border z-10 ${
                        item.isVeg
                          ? "bg-green-900/80 text-green-400 border-green-500"
                          : "bg-red-900/80 text-red-400 border-red-500"
                      }`}
                    >
                      {item.isVeg ? "VEG" : "NON-VEG"}
                    </span>
                  </div>

                  {/* Details Area */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-white leading-tight group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-primary font-bold text-lg">
                        ₹{item.price}
                      </p>
                    </div>

                    <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1 italic">
                      {item.description}
                    </p>

                    {/* 👇 BUTTON LOGIC UPDATED */}
                    <button
                      onClick={() => handleAddToCartClick(item)}
                      disabled={isOutOfStock}
                      className={`w-full font-extrabold py-3 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2 ${
                        isOutOfStock
                          ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                          : "bg-white hover:bg-green-500 hover:text-white text-black"
                      }`}
                    >
                      {isOutOfStock ? (
                        "UNAVAILABLE"
                      ) : item.variants?.length > 0 ||
                        item.addons?.length > 0 ? (
                        <>
                          Customize <ChevronRight size={18} />
                        </>
                      ) : (
                        <>
                          ADD <Plus size={18} strokeWidth={3} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🥘 CUSTOMIZATION MODAL (Same as before) */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 animate-in fade-in duration-200">
          <div className="bg-gray-900 w-full max-w-md sm:rounded-2xl rounded-t-2xl border border-gray-800 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0 z-10 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Customize "{selectedItem.name}"
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Make it your way! 🍳
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              {/* VARIANTS */}
              {selectedItem.variants && selectedItem.variants.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Select Size / Option
                  </h4>
                  <div className="space-y-2">
                    {selectedItem.variants.map((variant, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all ${
                          selectedVariant === variant
                            ? "bg-primary/10 border-primary"
                            : "bg-gray-800 border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedVariant === variant
                                ? "border-primary"
                                : "border-gray-500"
                            }`}
                          >
                            {selectedVariant === variant && (
                              <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                            )}
                          </div>
                          <span
                            className={`font-bold ${
                              selectedVariant === variant
                                ? "text-white"
                                : "text-gray-300"
                            }`}
                          >
                            {variant.name}
                          </span>
                        </div>
                        <span className="text-white font-mono">
                          ₹{variant.price}
                        </span>
                        <input
                          type="radio"
                          name="variant"
                          className="hidden"
                          checked={selectedVariant === variant}
                          onChange={() => setSelectedVariant(variant)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ADD-ONS */}
              {selectedItem.addons && selectedItem.addons.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Add Extras
                  </h4>
                  <div className="space-y-2">
                    {selectedItem.addons.map((addon, idx) => {
                      const isSelected = selectedAddons.some(
                        (a) => a._id === addon._id
                      );
                      return (
                        <label
                          key={idx}
                          className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all ${
                            isSelected
                              ? "bg-green-500/10 border-green-500"
                              : "bg-gray-800 border-gray-700 hover:border-gray-600"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? "border-green-500 bg-green-500"
                                  : "border-gray-500"
                              }`}
                            >
                              {isSelected && (
                                <Check size={14} className="text-black" />
                              )}
                            </div>
                            <span
                              className={`font-bold ${
                                isSelected ? "text-white" : "text-gray-300"
                              }`}
                            >
                              {addon.name}
                            </span>
                          </div>
                          <span className="text-white font-mono">
                            +₹{addon.price}
                          </span>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => toggleAddon(addon)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900 sticky bottom-0 rounded-b-2xl">
              <button
                onClick={confirmCustomization}
                className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-bold text-lg flex justify-between items-center px-6 transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <span>Add Item</span>
                <span>₹{finalPrice}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
