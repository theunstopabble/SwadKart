import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import io from "socket.io-client";
import {
  Plus,
  UtensilsCrossed,
  X,
  Check,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { BASE_URL } from "../config";
import { toast } from "react-hot-toast";

// Modular Components
import MenuHero from "../components/restaurant/MenuHero";
import MenuFilters from "../components/restaurant/MenuFilters";

const RestaurantMenu = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isVegOnly, setIsVegOnly] = useState(false);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [finalPrice, setFinalPrice] = useState(0);

  // 1. Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resRes, menuRes] = await Promise.all([
          fetch(`${BASE_URL}/api/v1/users/${id}`),
          fetch(`${BASE_URL}/api/v1/products/restaurant/${id}`),
        ]);
        const resData = await resRes.json();
        const menuData = await menuRes.json();
        setRestaurant(resData.data || resData);
        setMenu(Array.isArray(menuData) ? menuData : menuData.products || []);
      } catch (error) {
        toast.error("Error loading menu");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 2. Socket Connection
  useEffect(() => {
    const socket = io(BASE_URL);
    socket.on("productUpdated", (updated) => {
      setMenu((prev) =>
        prev.map((it) => (it._id === updated._id ? { ...it, ...updated } : it))
      );
    });
    return () => socket.disconnect();
  }, []);

  // 3. Categorization Logic
  const categorizedMenu = useMemo(() => {
    let filtered = menu.filter(
      (it) =>
        it.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!isVegOnly || it.isVeg)
    );
    const groups = {};
    filtered.forEach((it) => {
      const cat = it.category || "Main Menu";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    });
    return groups;
  }, [menu, searchTerm, isVegOnly]);

  // 4. Price Logic
  useEffect(() => {
    if (!selectedItem) return;
    let price = selectedVariant
      ? Number(selectedVariant.price)
      : Number(selectedItem.price);
    const addonsPrice = selectedAddons.reduce(
      (acc, a) => acc + Number(a.price),
      0
    );
    setFinalPrice(price + addonsPrice);
  }, [selectedVariant, selectedAddons, selectedItem]);

  const handleAddToCartClick = (item) => {
    if (item.countInStock === 0) return;
    if (!userInfo) {
      navigate("/login");
      return;
    }
    if (item.variants?.length > 0 || item.addons?.length > 0) {
      setSelectedItem(item);
      setSelectedVariant(item.variants?.[0] || null);
      setSelectedAddons([]);
      setShowModal(true);
    } else {
      dispatch(addToCart({ ...item, qty: 1 }));
      toast.success(`${item.name} added!`);
    }
  };

  const confirmCustomization = () => {
    dispatch(
      addToCart({
        ...selectedItem,
        price: finalPrice,
        selectedVariant,
        selectedAddons,
        qty: 1,
      })
    );
    setShowModal(false);
    toast.success("Customized dish added! 🛒");
  };

  if (loading)
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-extrabold italic tracking-widest text-xs uppercase">
          Loading Menu...
        </p>
      </div>
    );

  return (
    <div className="bg-black min-h-screen text-white pb-20 pt-24 font-sans">
      <MenuHero restaurant={restaurant} />
      <MenuFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isVegOnly={isVegOnly}
        setIsVegOnly={setIsVegOnly}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {Object.keys(categorizedMenu).length === 0 ? (
          <div className="text-center py-24 bg-gray-900 rounded-2xl border-2 border-dashed border-gray-800 shadow-xl">
            <UtensilsCrossed size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 text-lg font-extrabold uppercase italic tracking-widest">
              No dishes match your craving
            </p>
          </div>
        ) : (
          Object.entries(categorizedMenu).map(([category, items]) => (
            <section key={category} className="mb-16">
              <h2 className="text-2xl font-extrabold uppercase italic text-white mb-8 border-l-4 border-primary pl-4 flex items-center gap-3">
                {category}{" "}
                <span className="text-xs text-gray-400 font-bold bg-gray-900 px-3 py-1 rounded-lg border border-gray-800 not-italic tracking-normal">
                  {items.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group flex flex-col shadow-2xl relative hover:border-primary/40 transition-all duration-300"
                  >
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={item.image || "https://placehold.co/600x400"}
                        className={`w-full h-full object-cover transition-all duration-700 ${
                          item.countInStock === 0
                            ? "grayscale opacity-20"
                            : "group-hover:scale-110"
                        }`}
                        alt=""
                      />
                      {item.countInStock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                          <span className="text-red-500 font-extrabold border-4 border-red-500 px-4 py-2 rotate-[-12deg] text-xl tracking-widest uppercase">
                            Sold Out
                          </span>
                        </div>
                      )}
                      <span
                        className={`absolute top-4 right-4 text-[9px] font-extrabold px-3 py-1.5 rounded-full border shadow-lg uppercase tracking-wider ${
                          item.isVeg
                            ? "bg-green-950/80 text-green-400 border-green-500/30 backdrop-blur-md"
                            : "bg-red-950/80 text-red-400 border-red-500/30 backdrop-blur-md"
                        }`}
                      >
                        {item.isVeg ? "VEG" : "NON-VEG"}
                      </span>
                    </div>
                    <div className="p-6 flex flex-col flex-1 bg-gray-900">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-extrabold uppercase italic text-white group-hover:text-primary transition-colors leading-none">
                          {item.name}
                        </h3>
                        <span className="text-xl font-extrabold text-white italic">
                          ₹{item.price}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs font-bold italic mb-6 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                      <button
                        onClick={() => handleAddToCartClick(item)}
                        disabled={item.countInStock === 0}
                        className={`mt-auto w-full font-extrabold py-4 rounded-xl transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 ${
                          item.countInStock === 0
                            ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                            : "bg-white text-black hover:bg-primary hover:text-white shadow-lg active:scale-[0.98]"
                        }`}
                      >
                        {item.countInStock === 0 ? (
                          "Unavailable"
                        ) : item.variants?.length > 0 ? (
                          <>
                            Customize <ChevronRight size={14} />
                          </>
                        ) : (
                          <>
                            Add to Cart <ShoppingBag size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* 🥘 Customization Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex justify-center items-center z-[9999] p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="p-8 pb-4 border-b border-gray-800 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-extrabold uppercase italic text-white leading-none mb-1">
                  {selectedItem.name}
                </h3>
                <p className="text-primary font-bold text-xs uppercase tracking-widest">
                  Customize your meal
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-800 text-gray-400 hover:text-white p-2 rounded-lg transition-colors border border-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto no-scrollbar space-y-8 flex-1">
              {/* Variants */}
              {selectedItem.variants?.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Select Size
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedItem.variants.map((v) => (
                      <label
                        key={v.name}
                        className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all cursor-pointer group ${
                          selectedVariant === v
                            ? "bg-primary/10 border-primary text-white shadow-lg shadow-primary/10"
                            : "bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedVariant === v
                                ? "border-primary"
                                : "border-gray-700"
                            }`}
                          >
                            {selectedVariant === v && (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                            )}
                          </div>
                          <span className="font-bold uppercase text-xs tracking-wider">
                            {v.name}
                          </span>
                        </div>
                        <span className="font-extrabold italic">
                          ₹{v.price}
                        </span>
                        <input
                          type="radio"
                          className="hidden"
                          checked={selectedVariant === v}
                          onChange={() => setSelectedVariant(v)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons */}
              {selectedItem.addons?.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Add Extras
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedItem.addons.map((a) => {
                      const isSel = selectedAddons.some(
                        (sa) => sa._id === a._id
                      );
                      return (
                        <label
                          key={a._id}
                          className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSel
                              ? "bg-primary/5 border-primary/50 text-white"
                              : "bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                isSel
                                  ? "bg-primary border-primary"
                                  : "border-gray-700 bg-transparent"
                              }`}
                            >
                              {isSel && (
                                <Check size={12} className="text-white" />
                              )}
                            </div>
                            <span className="font-bold uppercase text-xs tracking-wider">
                              {a.name}
                            </span>
                          </div>
                          <span className="font-extrabold italic text-gray-400">
                            +₹{a.price}
                          </span>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSel}
                            onChange={() =>
                              setSelectedAddons((prev) =>
                                isSel
                                  ? prev.filter((sa) => sa._id !== a._id)
                                  : [...prev, a]
                              )
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-900 border-t border-gray-800 rounded-b-2xl">
              <button
                onClick={confirmCustomization}
                className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-extrabold uppercase flex justify-between items-center px-8 transition-all active:scale-[0.98] shadow-lg shadow-primary/25 text-xs tracking-[0.2em]"
              >
                <span>Add to Cart</span>
                <span className="bg-black/30 px-3 py-1 rounded-lg border border-white/10">
                  ₹{finalPrice}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
