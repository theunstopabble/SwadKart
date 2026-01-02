import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Clock, Star, ArrowRight, Loader2 } from "lucide-react";
import { BASE_URL } from "../config";
import io from "socket.io-client";

// --- Category Bar Component (Internal for easy access) ---
const CategoryBar = ({ activeCategory, setActiveCategory }) => {
  const categories = [
    { name: "All", icon: "🍱" },
    { name: "Pizza", icon: "🍕" },
    { name: "Burgers", icon: "🍔" },
    { name: "Starters", icon: "🍟" },
    { name: "Main Course", icon: "🍛" },
    { name: "Desserts", icon: "🍰" },
    { name: "Drinks", icon: "🥤" },
  ];

  return (
    <div className="flex overflow-x-auto gap-4 py-6 no-scrollbar mb-4">
      {categories.map((cat) => (
        <button
          key={cat.name}
          onClick={() => setActiveCategory(cat.name)}
          className={`flex items-center gap-2 px-6 py-2 rounded-full whitespace-nowrap transition-all border ${
            activeCategory === cat.name
              ? "bg-primary border-primary text-white"
              : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600"
          }`}
        >
          <span>{cat.icon}</span>
          <span className="text-xs font-bold uppercase">{cat.name}</span>
        </button>
      ))}
    </div>
  );
};

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All"); // 👈 Added state
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/restaurants`);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      const allShops = Array.isArray(data) ? data : data.restaurants || [];
      const sortedShops = allShops.sort(
        (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
      );
      setRestaurants(sortedShops);
      setFilteredRestaurants(sortedShops);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
    const socket = io(BASE_URL);
    socket.on("restaurantUpdated", (updatedShop) => {
      setRestaurants((prevShops) => {
        let updatedList = prevShops.map((shop) =>
          shop._id === updatedShop._id ? updatedShop : shop
        );
        const exists = prevShops.find((s) => s._id === updatedShop._id);
        if (!exists) updatedList.push(updatedShop);
        return [...updatedList].sort(
          (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
        );
      });
    });
    return () => socket.disconnect();
  }, []);

  // 🔍 Logic for BOTH Search and Category
  useEffect(() => {
    const results = restaurants.filter((shop) => {
      const matchSearch =
        shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        activeCategory === "All" ||
        shop.category?.toLowerCase() === activeCategory.toLowerCase();

      return matchSearch && matchCategory;
    });
    setFilteredRestaurants(results);
  }, [searchTerm, activeCategory, restaurants]);

  return (
    <div className="bg-black min-h-screen text-white pt-20">
      {/* Hero Section (Original UI) */}
      <div className="relative h-[500px] w-full bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Craving <span className="text-primary">Delicious</span> Food?
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl">
            Order from the best restaurants in Jaipur and get it delivered to
            your doorstep.
          </p>

          {/* Search Bar (Original UI) */}
          <div className="flex bg-white rounded-full overflow-hidden p-1 w-full max-w-xl shadow-2xl shadow-primary/20">
            <input
              type="text"
              placeholder="Search for restaurants or food..."
              className="flex-1 px-6 py-3 text-black outline-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-primary hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2">
              <Search size={20} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Restaurants List Section (Original UI) */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* 🔥 NEW FEATURE: Category Bar (Minimal UI impact) */}
        <CategoryBar
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />

        <div className="flex items-center gap-4 mb-10">
          <div className="w-1 h-10 bg-primary rounded-full"></div>
          <h2 className="text-3xl md:text-4xl font-bold">
            {searchTerm || activeCategory !== "All"
              ? `Results for your craving`
              : "Top Restaurants in Jaipur"}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-primary h-12 w-12" />
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl">
            <p className="text-gray-400 text-xl">
              No results found for your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500">
            {filteredRestaurants.map((shop) => (
              <Link
                to={`/restaurant/${shop._id}`}
                key={shop._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 group block"
              >
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={
                      shop.image ||
                      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80"
                    }
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 text-yellow-400 font-bold text-sm">
                    <Star size={14} fill="currentColor" /> 4.5
                  </div>
                  <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                    New
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {shop.name}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                    <MapPin size={16} className="text-primary" />
                    <span>Jaipur, Rajasthan</span>
                  </div>

                  <div className="border-t border-gray-800 pt-4 flex justify-between items-center text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock size={16} /> 30-40 mins
                    </div>
                    <span className="flex items-center gap-1 text-white font-bold group-hover:translate-x-2 transition-transform">
                      View Menu <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
