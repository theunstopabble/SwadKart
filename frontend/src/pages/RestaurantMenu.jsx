import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import {
  Star,
  MapPin,
  Clock,
  Plus,
  Search,
  UtensilsCrossed,
} from "lucide-react"; // 👈 Added Search icons
import { BASE_URL } from "../config";

const RestaurantMenu = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [filteredMenu, setFilteredMenu] = useState([]); // 👈 For Search logic
  const [searchTerm, setSearchTerm] = useState(""); // 👈 Search state
  const [loading, setLoading] = useState(true);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);

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
        } else if (menuData.products && Array.isArray(menuData.products)) {
          finalMenu = menuData.products;
        } else if (menuData.data && Array.isArray(menuData.data)) {
          finalMenu = menuData.data;
        }
        setMenu(finalMenu);
        setFilteredMenu(finalMenu); // 👈 Initialized filtered menu
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 🔍 Professional Filter Logic (Non-UI Destructive)
  useEffect(() => {
    const results = menu.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMenu(results);
  }, [searchTerm, menu]);

  const handleAddToCart = (item) => {
    if (!userInfo) {
      alert("Please Login to order food! 🍔");
      navigate("/login");
    } else {
      dispatch(addToCart({ ...item, qty: 1 }));
      alert(`${item.name} added to cart! 🛒`);
    }
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

      {/* 🔍 PROFESSIONAL SEARCH BAR (Theme Consistent) */}
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
            <p className="text-sm text-gray-500 mt-2">
              Try searching for something else or clear the filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((item) => (
              <div
                key={item._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 group flex flex-col animate-in fade-in zoom-in-95 duration-300"
              >
                {/* Image Area */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={
                      item.image || "https://placehold.co/600x400?text=No+Image"
                    }
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {item.isVeg ? (
                    <span className="absolute top-3 right-3 bg-green-900/80 text-green-400 text-xs font-bold px-2 py-1 rounded border border-green-500">
                      VEG
                    </span>
                  ) : (
                    <span className="absolute top-3 right-3 bg-red-900/80 text-red-400 text-xs font-bold px-2 py-1 rounded border border-red-500">
                      NON-VEG
                    </span>
                  )}
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

                  <button
                    onClick={() => handleAddToCart(item)}
                    className="w-full bg-white hover:bg-green-500 hover:text-white text-black font-extrabold py-3 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2"
                  >
                    ADD <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantMenu;
