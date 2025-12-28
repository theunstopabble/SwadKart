import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Clock, Star, ArrowRight, Utensils } from "lucide-react";
import { BASE_URL } from "../config";

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]); // 👈 Filtered list के लिए
  const [searchTerm, setSearchTerm] = useState(""); // 👈 Search input के लिए
  const [loading, setLoading] = useState(true);

  // Fetch Restaurants
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/users/restaurants`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();

        const allRestaurants = Array.isArray(data) ? data : data.restaurants || [];
        setRestaurants(allRestaurants);
        setFilteredRestaurants(allRestaurants); // शुरुआत में सब दिखाओ
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  // 🔍 Professional Search Logic
  useEffect(() => {
    const results = restaurants.filter((shop) =>
      shop.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRestaurants(results);
  }, [searchTerm, restaurants]);

  return (
    <div className="bg-black min-h-screen text-white pt-20">
      {/* Hero Section */}
      <div className="relative h-[500px] w-full bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Craving <span className="text-primary">Delicious</span> Food?
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl">
            Order from the best restaurants in Jaipur and get it delivered to your doorstep.
          </p>

          {/* 🔍 WORKING SEARCH BAR */}
          <div className="flex bg-white rounded-full overflow-hidden p-1 w-full max-w-xl shadow-2xl shadow-primary/20 border-2 border-transparent focus-within:border-primary transition-all">
            <input
              type="text"
              placeholder="Search for restaurants (e.g. Burger King)..."
              className="flex-1 px-6 py-3 text-black outline-none font-medium text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // 👈 Live Search
            />
            <div className="bg-primary text-white px-6 py-3 rounded-full font-bold flex items-center gap-2">
              <Search size={20} />
            </div>
          </div>
          {searchTerm && (
             <p className="mt-4 text-primary font-bold animate-pulse text-sm">
                Showing results for "{searchTerm}"
             </p>
          )}
        </div>
      </div>

      {/* Restaurants List Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-1 h-10 bg-primary rounded-full"></div>
            <h2 className="text-3xl md:text-4xl font-bold">
              {searchTerm ? "Search Results" : "Top Restaurants in Jaipur"}
            </h2>
          </div>
          <span className="text-gray-500 font-bold bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
             {filteredRestaurants.length} Places Found
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center text-xl animate-pulse">Finding best food spots...</p>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-3xl border border-dashed border-gray-800">
            <Utensils className="mx-auto text-gray-700 mb-4" size={60} />
            <p className="text-gray-400 text-xl font-bold">No restaurants match your search.</p>
            <button onClick={() => setSearchTerm("")} className="mt-4 text-primary underline font-bold">Clear search</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRestaurants.map((shop) => (
              <Link
                to={`/restaurant/${shop._id}`}
                key={shop._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 group block animate-in fade-in zoom-in duration-300"
              >
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={shop.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80"}
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 text-yellow-400 font-bold text-sm">
                    <Star size={14} fill="currentColor" /> 4.5
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors italic">
                    {shop.name}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                    <MapPin size={16} className="text-primary" />
                    <span>Jaipur, Rajasthan</span>
                  </div>

                  <div className="border-t border-gray-800 pt-4 flex justify-between items-center text-sm text-gray-500">
                    <div className="flex items-center gap-2 font-bold">
                      <Clock size={16} className="text-green-500" /> 30-40 mins
                    </div>
                    <span className="flex items-center gap-1 text-white font-bold group-hover:translate-x-2 transition-transform">
                      View Menu <ArrowRight size={16} className="text-primary" />
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