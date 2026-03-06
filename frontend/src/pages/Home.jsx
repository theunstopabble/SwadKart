import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Clock, Star, ArrowRight, Loader2 } from "lucide-react";
import { BASE_URL } from "../config";

// Lazy-load VoiceSearch: non-critical, only needed on user interaction
const VoiceSearch = lazy(() => import("../components/VoiceSearch"));

import { toast } from "react-hot-toast";

// Hero image URL (aggressively optimized for mobile: 600px width, q=60, WebP)
// Hero image: self-hosted for zero DNS/TLS overhead (same Unsplash image, saved locally)
const HERO_IMG_URL = "/hero.webp";

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // 1. Fetch Restaurants
  const fetchRestaurants = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/restaurants`);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      const allShops = Array.isArray(data) ? data : data.restaurants || [];

      // Sort by orderIndex
      const sortedShops = allShops.sort(
        (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0),
      );

      setRestaurants(sortedShops);
      setFilteredRestaurants(sortedShops);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      toast.error("Failed to connect to backend. Check if server is running!");
    } finally {
      setLoading(false);
    }
  };

  // 2. Real-time Updates via Socket.io (Lazy-loaded to reduce initial bundle)
  useEffect(() => {
    fetchRestaurants();

    // Dynamic import: Socket.IO is loaded only when needed (~100KB saved from initial bundle)
    import("socket.io-client").then(({ default: io }) => {
      const socket = io(BASE_URL);
      socketRef.current = socket;

      socket.on("restaurantUpdated", (updatedShop) => {
        setRestaurants((prevShops) => {
          let updatedList = prevShops.map((shop) =>
            shop._id === updatedShop._id ? updatedShop : shop,
          );

          // If new restaurant added via admin panel
          const exists = prevShops.find((s) => s._id === updatedShop._id);
          if (!exists) updatedList.push(updatedShop);

          return [...updatedList].sort(
            (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0),
          );
        });
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // 3. Search Filtering Logic
  useEffect(() => {
    const results = restaurants.filter((shop) => {
      return (
        shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    setFilteredRestaurants(results);
  }, [searchTerm, restaurants]);

  return (
    <div className="bg-black min-h-screen text-white pt-20">
      {/* ================= HERO SECTION ================= */}
      {/* Using <img> instead of CSS background-image for better LCP discovery by browser preload scanner */}
      <div className="relative h-[500px] w-full overflow-hidden">
        <img
          src={HERO_IMG_URL}
          alt="Delicious food spread"
          fetchPriority="high"
          decoding="async"
          width={480}
          height={300}
          sizes="100vw"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Craving <span className="text-primary">Delicious</span> Food?
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl">
            Order from the best restaurants in Jaipur and get it delivered to
            your doorstep.
          </p>

          {/* 👇 SEARCH BAR UI */}
          <div className="w-full max-w-xl mx-auto mt-6">
            <div className="flex items-center bg-white rounded-full shadow-2xl shadow-primary/20 p-1.5 border border-transparent focus-within:border-primary/50 transition-all">
              {/* Input Field */}
              <input
                type="text"
                placeholder="Search for restaurants..."
                className="flex-1 bg-transparent px-4 md:px-6 py-2 text-black outline-none font-medium placeholder:text-gray-400 min-w-0 text-sm md:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Voice Search (lazy-loaded) */}
              <div className="shrink-0 pr-2 cursor-pointer hover:scale-110 transition-transform">
                <Suspense fallback={null}>
                  <VoiceSearch setSearchTerm={setSearchTerm} />
                </Suspense>
              </div>

              {/* Divider */}
              <div className="h-6 w-[1px] bg-gray-300 mx-1"></div>

              {/* Search Button */}
              <button
                aria-label="Search restaurants"
                className="bg-primary hover:bg-red-600 text-white p-3 md:px-6 md:py-3 rounded-full font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-md"
              >
                <Search size={20} />
                <span className="hidden md:block">Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RESTAURANT LIST ================= */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-1 h-10 bg-primary rounded-full"></div>
          <h2 className="text-3xl md:text-4xl font-bold">
            {searchTerm
              ? `Results for "${searchTerm}"`
              : "Top Restaurants in Jaipur"}
          </h2>
        </div>

        {/* Loading / No Data / List */}
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
                {/* Image Section */}
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={
                      shop.image ||
                      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=70&fm=webp&auto=format&fit=crop"
                    }
                    alt={shop.name || "Restaurant image"}
                    loading="lazy"
                    width={400}
                    height={267}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 text-yellow-400 font-bold text-sm">
                    <Star size={14} fill="currentColor" /> {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
                  </div>
                  <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                    {shop.isOpenNow ? "Open" : "Closed"}
                  </div>
                </div>

                {/* Details Section */}
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
                      <Clock size={16} /> {shop.isOpenNow ? "30-40 mins" : "Currently Closed"}
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
