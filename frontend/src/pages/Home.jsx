import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Search, MapPin, Clock, Star, ArrowRight, Loader2, Trophy, Sparkles } from "lucide-react";
import { BASEURL } from "../config";
import { getSocket } from "../utils/socket.js";
import PageSEO from "../components/SEO/PageSEO";
import { toJsonLd, localBusinessSchema, breadcrumbSchema } from "../utils/structuredData";

// Lazy-load VoiceSearch: non-critical, only needed on user interaction
const VoiceSearch = lazy(() => import("../components/VoiceSearch"));
import OrderAgain from "../components/OrderAgain";
import { toast } from "react-hot-toast";

// Hero image URL (aggressively optimized for mobile: 600px width, q=60, WebP)
// Hero image: self-hosted for zero DNS/TLS overhead (same Unsplash image, saved locally)
const HERO_IMG_URL = "/hero.webp";

const Home = () => {
 const { t } = useTranslation("common");
 const { userInfo } = useSelector((state) => state.user);
 const [restaurants, setRestaurants] = useState([]);
 const [filteredRestaurants, setFilteredRestaurants] = useState([]);
 const [searchTerm, setSearchTerm] = useState("");
 const [loading, setLoading] = useState(true);
 const [recommendations, setRecommendations] = useState([]);
 const socketRef = useRef(null);

 // 1. Fetch Restaurants
 const fetchRestaurants = async () => {
 try {
 const res = await fetch(`${BASEURL}/api/v1/restaurants`);
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

 // 2. Real-time Updates via Socket.io (Uses shared singleton for correct URL)
 useEffect(() => {
 fetchRestaurants();

 // FEAT-26: Fetch AI dish recommendations for logged-in users
 const abortRecs = new AbortController();
 if (userInfo) {
 fetch(`${BASEURL}/api/v1/analytics/recommendations?limit=6`, { credentials: "include", signal: abortRecs.signal })
 .then((r) => r.ok ? r.json() : null)
 .then((data) => {
 if (data?.recommendations) setRecommendations(data.recommendations);
 })
 .catch(() => {}); // Silent fail
 }

 // Only connect socket for authenticated users; server rejects anonymous connections
 let socket = null;
 let handleRestaurantUpdate;
 if (userInfo) {
 socket = getSocket();
 socketRef.current = socket;

 handleRestaurantUpdate = (updatedShop) => {
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
 };
 socket.on("restaurantUpdated", handleRestaurantUpdate);
 }

 return () => {
 abortRecs.abort();
 if (socket && handleRestaurantUpdate) {
 socket.off("restaurantUpdated", handleRestaurantUpdate);
 }
 };
 }, [userInfo]);

 // 3. Search Filtering Logic
 useEffect(() => {
 const results = restaurants.filter((shop) => {
 return (
 (shop.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
 (shop.description || "").toLowerCase().includes(searchTerm.toLowerCase())
 );
 });
 setFilteredRestaurants(results);
 }, [searchTerm, restaurants]);

 // 4. Hero image fallback for broken URLs
 const handleHeroError = (e) => {
 e.target.style.display = "none";
 };

 const homeSchema = localBusinessSchema();
 const homeBreadcrumb = breadcrumbSchema([{ name: "Home", url: "/" }]);

 return (
 <div className="bg-black min-h-screen text-white pt-20">
 <PageSEO
 title="Order Food Online in Jaipur — Fastest AI-Powered Food Delivery"
 description="Order delicious food from top restaurants in Jaipur. AI chatbot, real-time GPS tracking, voice search & secure payments. Download the SwadKart app today!"
 keywords="food delivery app, order food online jaipur, best restaurant delivery, AI food recommendations, voice search food, SwadKart"
 canonicalPath="/"
 jsonLdScripts={[toJsonLd(homeSchema), toJsonLd(homeBreadcrumb)]}
 />
 {/* ================= HERO SECTION ================= */}
 {/* Using <img> instead of CSS background-image for better LCP discovery by browser preload scanner */}
 <div className="relative min-h-[50vh] md:h-[500px] w-full overflow-hidden">
 <img
 src={HERO_IMG_URL}
 alt="Delicious food spread"
 fetchPriority="high"
 decoding="async"
 onError={handleHeroError}
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
 placeholder={t("search")}
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
 <span className="hidden md:block">{t("searchBtn")}</span>
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
 {(searchTerm
 ? `${t("resultsFor")} "${(searchTerm || "").slice(0, 50)}"`
 : t("topRestaurants"))}
 </h2>
 </div>

 {/* Loading / No Data / List */}
 {loading ? (
 <div className="flex justify-center items-center h-64">
 <Loader2 className="animate-spin animate-gpu text-primary h-12 w-12" />
 </div>
 ) : filteredRestaurants.length === 0 ? (
 <div className="text-center py-20 bg-gray-900 rounded-2xl">
 <p className="text-gray-400 text-xl">
 {t("noResults")}
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500">
 {filteredRestaurants.map((shop) => (
 <Link
 to={`/restaurant/${shop._id}`}
 key={shop._id}
 className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 group block animate-gpu"
 >
 {/* Image Section */}
 <div className="relative h-60 overflow-hidden">
 <img
 src={
 shop.image
 ? `${BASEURL}/api/v1/image/thumbnail?url=${encodeURIComponent(shop.image)}&w=400&q=75&fit=cover`
 : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=70&fm=webp&auto=format&fit=crop"
 }
 alt={shop.name || "Restaurant image"}
 loading="lazy"
 onError={(e) => {
 e.target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=70&fm=webp&fit=crop";
 }}
 width={400}
 height={267}
 sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
 />
 {/* ⭐ Rating Badge */}
 <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 text-yellow-400 font-bold text-sm">
 <Star size={14} fill="currentColor" />{" "}
 {shop.rating > 0 ? shop.rating.toFixed(1) : t("new")}
 </div>
 {/* ✅ FIX: Open = green, Closed = red */}
 <div
 className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg text-white ${
 shop.isOpenNow ? "bg-green-500" : "bg-red-600/90"
 }`}
 >
 {shop.isOpenNow ? t("open") : t("closed")}
 </div>
 {/* 🏆 Performance Score */}
 {shop.performanceScore > 0 && (
 <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 text-amber-400 font-bold text-xs">
 <Trophy size={12} /> {shop.performanceScore} {t("score")}
 </div>
 )}
 </div>

 {/* Details Section */}
 <div className="p-6">
 <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
 {shop.name || "Restaurant"}
 </h3>
 <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
 <MapPin size={16} className="text-primary" />
 <span>Jaipur, Rajasthan</span>
 </div>

 <div className="border-t border-gray-800 pt-4 flex justify-between items-center text-sm text-gray-500">
 <div className="flex items-center gap-2">
 <Clock size={16} />{" "}
 {shop.isOpenNow ? t("deliveryTime") : t("currentlyClosed")}
 </div>
 <span className="flex items-center gap-1 text-white font-bold group-hover:translate-x-2 transition-transform">
 {t("viewMenu")} <ArrowRight size={16} />
 </span>
 </div>
 </div>
 </Link>
 ))}
 </div>
 )}

 {/* FEAT-6: Smart Reorder / Order Again */}
 <OrderAgain />

 {/* FEAT-26: AI Dish Recommendations */}
 {recommendations.length > 0 && (
 <div className="mt-16">
 <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
 <Sparkles size={24} className="text-primary" />
 Recommended <span className="text-primary">For You</span>
 </h2>
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
 {recommendations.map((rec, idx) => (
 <Link
 key={rec._id?.toString() || rec.productId?.toString() || idx}
 to={`/restaurant/${rec.restaurant}`}
 className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all group"
 >
 <div className="h-32 overflow-hidden">
 <img
 src={rec.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300"}
 alt={rec.name}
 className="w-full h-full object-cover group-hover:scale-110 transition-transform"
 loading="lazy"
 />
 </div>
 <div className="p-3">
 <p className="text-sm font-bold truncate">{rec.name}</p>
 <p className="text-xs text-green-400 font-bold">{rec.reason}</p>
 {rec.price > 0 && (
 <p className="text-xs text-gray-400 mt-1">₹{rec.price}</p>
 )}
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
};

export default Home;


