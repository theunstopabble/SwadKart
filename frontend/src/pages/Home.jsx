import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Clock,
  Star,
  ArrowRight,
  Utensils,
  Pizza,
} from "lucide-react";
import { BASE_URL } from "../config";

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch Restaurants & Their Products
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/users/restaurants`);
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();

        const allShops = Array.isArray(data) ? data : data.restaurants || [];

        // हर रेस्टोरेंट के लिए उनके प्रोडक्ट्स (Menu) भी साथ में फेच करना बेहतर होगा
        // या फिर हम सिर्फ नाम के आधार पर बेसिक सर्च कर सकते हैं।
        setRestaurants(allShops);
        setFilteredRestaurants(allShops);
      } catch (error) {
        console.error("Error fetching:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  // 🔍 ADVANCED SEARCH LOGIC: Restaurant Name + Cuisine/Category
  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();

    const results = restaurants.filter((shop) => {
      // 1. रेस्टोरेंट के नाम में सर्च करें
      const matchName = shop.name.toLowerCase().includes(lowerSearch);

      // 2. रेस्टोरेंट के डिस्क्रिप्शन या कैटेगरी में सर्च करें (जैसे: Pizza, Fast Food)
      const matchDescription = shop.description
        ?.toLowerCase()
        .includes(lowerSearch);

      return matchName || matchDescription;
    });

    setFilteredRestaurants(results);
  }, [searchTerm, restaurants]);

  return (
    <div className="bg-black min-h-screen text-white pt-20">
      {/* Hero Section */}
      <div className="relative h-[500px] w-full bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Craving <span className="text-primary">Delicioust</span> Food?
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl">
            Order from the best restaurants in Jaipur and get it delivered to
            your doorstep.
          </p>

          {/* 🔍 MULTI-PURPOSE SEARCH BAR */}
          <div className="flex bg-white rounded-full overflow-hidden p-1 w-full max-w-2xl shadow-2xl shadow-primary/20 border-2 border-transparent focus-within:border-primary transition-all">
            <input
              type="text"
              placeholder="Search restaurant or food (e.g. Pizza, Burger)..."
              className="flex-1 px-6 py-4 text-black outline-none font-medium text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-primary hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2">
              <Search size={22} />
            </button>
          </div>

          {/* Quick Suggestions Tags */}
          <div className="flex gap-3 mt-6 flex-wrap justify-center">
            {["Pizza", "Burger", "Thali", "Italian"].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchTerm(tag)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold border border-white/10 transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold">
            {searchTerm ? `Results for "${searchTerm}"` : "Explore Restaurants"}
          </h2>
          <div className="text-primary font-mono text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            {filteredRestaurants.length} active spots
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-500 font-bold">
              Chef is preparing the list...
            </p>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-3xl border border-gray-800">
            <Utensils className="mx-auto text-gray-800 mb-4" size={80} />
            <h3 className="text-2xl font-bold text-gray-400">
              Oops! We couldn't find that.
            </h3>
            <p className="text-gray-600 mt-2">
              Try searching for something else like "Jaipur" or "Cafe"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredRestaurants.map((shop) => (
              <Link
                to={`/restaurant/${shop._id}`}
                key={shop._id}
                className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 group block"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={
                      shop.image ||
                      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80"
                    }
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white font-bold text-xs flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-yellow-400 fill-yellow-400"
                    />{" "}
                    4.8 (500+ reviews)
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-2xl font-black group-hover:text-primary transition-colors uppercase tracking-tight">
                      {shop.name}
                    </h3>
                  </div>

                  {/* Shop Description/Tags - यही मेनू सर्च में मदद करता है */}
                  <p className="text-gray-500 text-sm mb-6 line-clamp-1 italic">
                    {shop.description || "North Indian • Chinese • Desserts"}
                  </p>

                  <div className="border-t border-gray-800/50 pt-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                        <MapPin size={14} className="text-primary" /> Jaipur
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                        <Clock size={14} className="text-green-500" /> 25 min
                      </div>
                    </div>
                    <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center group-hover:w-28 transition-all duration-300 overflow-hidden">
                      <span className="text-[10px] font-black text-white opacity-0 group-hover:opacity-100 whitespace-nowrap ml-2">
                        ORDER NOW
                      </span>
                      <ArrowRight
                        size={16}
                        className="text-white min-w-[32px]"
                      />
                    </div>
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
