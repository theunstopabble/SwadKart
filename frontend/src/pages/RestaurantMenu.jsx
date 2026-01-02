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
    let price = selectedVariant ? selectedVariant.price : selectedItem.price;
    setFinalPrice(price + selectedAddons.reduce((acc, a) => acc + a.price, 0));
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

  if (loading)
    return (
      <div className="h-screen bg-black flex items-center justify-center text-primary font-black italic animate-pulse">
        PREPARING MENU...
      </div>
    );

  return (
    <div className="bg-black min-h-screen text-white pb-20 pt-16 font-sans">
      <MenuHero restaurant={restaurant} />
      <MenuFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isVegOnly={isVegOnly}
        setIsVegOnly={setIsVegOnly}
      />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {Object.keys(categorizedMenu).length === 0 ? (
          <div className="text-center py-24 bg-gray-950 rounded-[3rem] border-2 border-dashed border-gray-900">
            <UtensilsCrossed size={56} className="mx-auto text-gray-800 mb-4" />
            <p className="text-gray-600 text-xl font-black uppercase italic">
              No dishes match your craving
            </p>
          </div>
        ) : (
          Object.entries(categorizedMenu).map(([category, items]) => (
            <section key={category} className="mb-16">
              <h2 className="text-2xl font-black uppercase italic text-white mb-8 border-l-4 border-primary pl-4">
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="bg-gray-950 border border-gray-900 rounded-[2.5rem] overflow-hidden group flex flex-col shadow-2xl relative"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.image || "https://placehold.co/600x400"}
                        className={`w-full h-full object-cover transition-all ${
                          item.countInStock === 0
                            ? "grayscale opacity-30"
                            : "group-hover:scale-110"
                        }`}
                        alt=""
                      />
                      {item.countInStock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-red-500 font-black border-2 border-red-500 px-3 py-1 rotate-[-10deg]">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                      <span
                        className={`absolute top-4 right-4 text-[8px] font-black px-3 py-1 rounded-full border ${
                          item.isVeg
                            ? "bg-green-950 text-green-400 border-green-500"
                            : "bg-red-950 text-red-400 border-red-500"
                        }`}
                      >
                        {item.isVeg ? "VEG" : "NON-VEG"}
                      </span>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-black uppercase italic text-white group-hover:text-primary">
                          {item.name}
                        </h3>
                        <span className="text-xl font-black text-primary italic">
                          ₹{item.price}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs font-bold italic mb-6 line-clamp-2">
                        {item.description}
                      </p>
                      <button
                        onClick={() => handleAddToCartClick(item)}
                        disabled={item.countInStock === 0}
                        className={`w-full font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-widest ${
                          item.countInStock === 0
                            ? "bg-gray-900 text-gray-700"
                            : "bg-white text-black hover:bg-primary hover:text-white"
                        }`}
                      >
                        {item.countInStock === 0
                          ? "Unavailable"
                          : item.variants?.length > 0
                          ? "Customize"
                          : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* 🥘 Customization Modal remains in-page or could be separate too */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex justify-center items-center z-[9999] p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-gray-950 w-full max-w-md rounded-[3rem] border border-gray-900 shadow-2xl relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-8 right-8 text-gray-500 hover:text-white transition-all"
            >
              <X size={24} />
            </button>
            <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
              <h3 className="text-2xl font-black uppercase italic text-white border-l-4 border-primary pl-4">
                Customise {selectedItem.name}
              </h3>
              {selectedItem.variants?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    Select Size
                  </p>
                  {selectedItem.variants.map((v) => (
                    <label
                      key={v.name}
                      className={`flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedVariant === v
                          ? "bg-primary/10 border-primary text-white"
                          : "bg-black border-gray-800 text-gray-500"
                      }`}
                    >
                      <span className="font-black uppercase italic text-xs">
                        {v.name}
                      </span>
                      <span className="font-black italic">₹{v.price}</span>
                      <input
                        type="radio"
                        name="variant"
                        className="hidden"
                        checked={selectedVariant === v}
                        onChange={() => setSelectedVariant(v)}
                      />
                    </label>
                  ))}
                </div>
              )}
              {selectedItem.addons?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    Add Extras
                  </p>
                  {selectedItem.addons.map((a) => {
                    const isSel = selectedAddons.some((sa) => sa._id === a._id);
                    return (
                      <label
                        key={a._id}
                        className={`flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSel
                            ? "bg-green-600/10 border-green-600 text-white"
                            : "bg-black border-gray-800 text-gray-500"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSel
                                ? "bg-green-600 border-green-600"
                                : "border-gray-700"
                            }`}
                          >
                            {isSel && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <span className="font-black uppercase italic text-xs">
                            {a.name}
                          </span>
                        </div>
                        <span className="font-black italic text-gray-400">
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
              )}
            </div>
            <div className="p-8 bg-black border-t border-gray-900 rounded-b-[3rem]">
              <button
                onClick={() => {
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
                }}
                className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase flex justify-between items-center px-10 transition-all active:scale-95 shadow-2xl shadow-primary/30"
              >
                <span>Confirm</span>
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
