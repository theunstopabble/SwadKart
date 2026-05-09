import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  ChefHat,
  Truck,
  Package,
  Bell,
  Globe,
  Crown,
  Trophy,
  Calendar,
  Shield,
  Users,
} from "lucide-react";
import { BASEURL } from "../config";
import { disconnectSocket } from "../utils/socket";

// 👇 Import PWA Button
import InstallPWA from "./InstallPWA";

const Navbar = () => {
  const { t, i18n } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { cartItems } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLangOpen(false);
  };

  // 🔔 Fetch notifications
  useEffect(() => {
    if (!userInfo) return;
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`${BASEURL}/api/v1/notifications/my`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silently fail
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [userInfo]);

  const logoutHandler = async () => {
    try {
      // Clear server-side HttpOnly cookie
      await fetch(`${BASEURL}/api/v1/users/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Proceed with frontend logout even if server call fails
    }
    dispatch({ type: "user/logout" });
    dispatch({ type: "cart/logout" });
    disconnectSocket();
    setIsOpen(false);
    navigate("/login");
  };

  const closeMenu = () => setIsOpen(false);

  return (
    /* FIXED: Added pt-8 for Mobile Status Bar compatibility and md:pt-0 for Desktop */
    <nav className="bg-gray-950 text-white border-b border-gray-800 fixed w-full z-50 top-0 pt-8 md:pt-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* ======================= LOGO ======================= */}
          <Link
            to="/"
            className="text-2xl font-extrabold text-primary tracking-tight flex items-center"
            onClick={closeMenu}
          >
            Swad<span className="text-white">Kart</span>
            <span className="w-2.5 h-2.5 rounded-full bg-primary mt-4 animate-bounce"></span>
          </Link>

          {/* ======================= 🖥️ DESKTOP MENU ======================= */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="hover:text-primary transition-colors font-medium"
            >
              {t("home")}
            </Link>

            {/* 👇 INSTALL APP BUTTON (Desktop Position) */}
            <InstallPWA />

            {userInfo ? (
              <>
                {userInfo.role === "admin" && (
                  <Link
                    to="/admin/dashboard"
                    className="hover:text-primary transition-colors font-medium text-yellow-400"
                  >
                    {t("adminPanel")}
                  </Link>
                )}
                {userInfo.role === "restaurant_owner" && (
                  <Link
                    to="/restaurant/dashboard"
                    className="hover:text-primary transition-colors font-medium text-green-400"
                  >
                    {t("kitchenDashboard")}
                  </Link>
                )}
                {userInfo.role === "delivery_partner" && (
                  <Link
                    to="/delivery/dashboard"
                    className="hover:text-primary transition-colors font-medium text-blue-400"
                  >
                    {t("deliveryDashboard")}
                  </Link>
                )}
                {userInfo.role === "user" && (
                  <Link
                    to="/myorders"
                    className="hover:text-primary transition-colors font-medium"
                  >
                    {t("myOrders")}
                  </Link>
                )}

                {/* 🔔 Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen((p) => !p)}
                    className="relative text-gray-300 hover:text-primary transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-white uppercase tracking-widest">{t("notifications")}</span>
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="text-gray-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">{t("noNotifications")}</p>
                        ) : (
                          notifications.slice(0, 5).map((n) => (
                            <div
                              key={n._id}
                              className={`px-3 py-2 border-b border-gray-800/50 hover:bg-gray-800 cursor-pointer ${n.read ? "opacity-60" : ""}`}
                              onClick={() => {
                                if (n.data?.orderId) navigate(`/order/${n.data.orderId}`);
                                setNotifOpen(false);
                              }}
                            >
                              <p className="text-[10px] font-bold text-white">{n.title}</p>
                              <p className="text-[9px] text-gray-400 truncate">{n.body}</p>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="p-2 border-t border-gray-800 text-center">
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`${BASEURL}/api/v1/notifications/read`, {
                                  method: "PATCH",
                                  credentials: "include",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ ids: "all" }),
                                });
                                setUnreadCount(0);
                                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                              } catch {
                                // no-op
                              }
                            }}
                            className="text-[9px] font-bold text-primary hover:text-red-400 uppercase tracking-widest"
                          >
                            {t("markAllRead")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  to="/profile"
                  className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-700 hover:border-primary transition-all"
                >
                  <User size={18} />
                  <span className="text-sm font-bold truncate max-w-[100px]">
                    {userInfo.name?.split(" ")[0] || "User"}
                  </span>
                </Link>

                <button
                  onClick={logoutHandler}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title={t("logout")}
                  aria-label={t("logout")}
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <div className="flex gap-4">
                <Link
                  to="/login"
                  className="text-white hover:text-primary font-bold"
                >
                  {t("login")}
                </Link>
                <Link
                  to="/register"
                  className="bg-primary hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm"
                >
                  {t("signUp")}
                </Link>
              </div>
            )}

            {/* 🌐 Language Toggle */}
            <div className="relative">
              <button
                onClick={() => setLangOpen((p) => !p)}
                className="text-gray-300 hover:text-primary transition-colors"
                aria-label={t("language")}
              >
                <Globe size={20} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <button
                    onClick={() => changeLanguage("en")}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 ${i18n.language === "en" ? "text-primary font-bold" : "text-white"}`}
                  >
                    {t("english")}
                  </button>
                  <button
                    onClick={() => changeLanguage("hi")}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 ${i18n.language === "hi" ? "text-primary font-bold" : "text-white"}`}
                  >
                    {t("hindi")}
                  </button>
                </div>
              )}
            </div>

            <Link
              to="/cart"
              className="relative group"
              aria-label={t("cart")}
            >
              <ShoppingCart
                size={24}
                className="text-gray-300 group-hover:text-primary transition-colors"
              />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cartItems.reduce((acc, item) => acc + item.qty, 0)}
                </span>
              )}
            </Link>
          </div>

          {/* ======================= 📱 MOBILE MENU BUTTONS ======================= */}
          {/* Cart + Install Button + Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            {/* 👇 INSTALL APP BUTTON (Mobile Position: Before Cart) */}
            <InstallPWA />

            <Link
              to="/cart"
              className="relative"
              onClick={closeMenu}
              aria-label={t("cart")}
            >
              <ShoppingCart size={22} className="text-gray-300" />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartItems.reduce((acc, item) => acc + item.qty, 0)}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white focus:outline-none ml-1"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* ======================= 📱 MOBILE MENU DROPDOWN ======================= */}
      {isOpen && (
        <div className="md:hidden bg-gray-900 border-b border-gray-800 animate-fade-in-down shadow-2xl">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link
              to="/"
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-800 hover:text-primary"
              onClick={closeMenu}
            >
              {t("home")}
            </Link>

            {userInfo ? (
              <>
                {userInfo.role === "admin" && (
                  <Link
                    to="/admin/dashboard"
                    className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-bold text-yellow-400 hover:bg-gray-800"
                    onClick={closeMenu}
                  >
                    <LayoutDashboard size={18} /> {t("adminPanel")}
                  </Link>
                )}

                {userInfo.role === "restaurant_owner" && (
                  <Link
                    to="/restaurant/dashboard"
                    className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-bold text-green-400 hover:bg-gray-800"
                    onClick={closeMenu}
                  >
                    <ChefHat size={18} /> {t("kitchenDashboard")}
                  </Link>
                )}

                {userInfo.role === "delivery_partner" && (
                  <Link
                    to="/delivery/dashboard"
                    className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-bold text-blue-400 hover:bg-gray-800"
                    onClick={closeMenu}
                  >
                    <Truck size={18} /> {t("deliveryDashboard")}
                  </Link>
                )}

                {userInfo.role === "user" && (
                  <Link
                    to="/myorders"
                    className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-medium text-gray-300 hover:bg-gray-800"
                    onClick={closeMenu}
                  >
                    <Package size={18} /> {t("myOrders")}
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-800 hover:text-primary"
                  onClick={closeMenu}
                >
                  {t("profile")} ({userInfo.name || "User"})
                </Link>

                {userInfo.role === "user" && (
                  <>
                    <Link
                      to="/swadpass"
                      className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-medium text-yellow-400 hover:bg-gray-800"
                      onClick={closeMenu}
                    >
                      <Crown size={18} /> SwadPass
                    </Link>
                    <Link
                      to="/rewards"
                      className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-medium text-purple-400 hover:bg-gray-800"
                      onClick={closeMenu}
                    >
                      <Trophy size={18} /> Rewards
                    </Link>
                    <Link
                      to="/reservations"
                      className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-medium text-orange-400 hover:bg-gray-800"
                      onClick={closeMenu}
                    >
                      <Calendar size={18} /> Reservations
                    </Link>
                    <Link
                      to="/group-orders"
                      className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-medium text-blue-400 hover:bg-gray-800"
                      onClick={closeMenu}
                    >
                      <Users size={18} /> Group Orders
                    </Link>
                  </>
                )}

                <Link
                  to="/privacy"
                  className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-medium text-gray-400 hover:bg-gray-800"
                  onClick={closeMenu}
                >
                  <Shield size={18} /> Privacy & Data
                </Link>

                <button
                  onClick={logoutHandler}
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-md text-base font-bold text-red-500 hover:bg-gray-800"
                >
                  <LogOut size={18} /> {t("logout")}
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Link
                  to="/login"
                  className="text-center py-2 border border-gray-600 rounded-lg font-bold hover:bg-gray-800 text-white"
                  onClick={closeMenu}
                >
                  {t("login")}
                </Link>
                <Link
                  to="/register"
                  className="text-center py-2 bg-primary text-white rounded-lg font-bold hover:bg-red-700"
                  onClick={closeMenu}
                >
                  {t("signUp")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
