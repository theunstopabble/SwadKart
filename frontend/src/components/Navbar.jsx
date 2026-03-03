import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/userSlice";
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
} from "lucide-react";

// 👇 Import PWA Button
import InstallPWA from "./InstallPWA";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { cartItems } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const logoutHandler = () => {
    dispatch(logout());
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
              Home
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
                    Admin Panel
                  </Link>
                )}
                {userInfo.role === "restaurant_owner" && (
                  <Link
                    to="/restaurant/dashboard"
                    className="hover:text-primary transition-colors font-medium text-green-400"
                  >
                    Kitchen Dashboard
                  </Link>
                )}
                {userInfo.role === "delivery_partner" && (
                  <Link
                    to="/delivery/dashboard"
                    className="hover:text-primary transition-colors font-medium text-blue-400"
                  >
                    Delivery Dashboard
                  </Link>
                )}
                {userInfo.role === "user" && (
                  <Link
                    to="/myorders"
                    className="hover:text-primary transition-colors font-medium"
                  >
                    My Orders
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-700 hover:border-primary transition-all"
                >
                  <User size={18} />
                  <span className="text-sm font-bold truncate max-w-[100px]">
                    {userInfo.name.split(" ")[0]}
                  </span>
                </Link>

                <button
                  onClick={logoutHandler}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                  aria-label="Logout"
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
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <Link
              to="/cart"
              className="relative group"
              aria-label="Shopping cart"
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
              aria-label="Shopping cart"
            >
              <ShoppingCart size={22} className="text-gray-300" />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartItems.length}
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
              Home
            </Link>

            {userInfo ? (
              <>
                {userInfo.role === "admin" && (
                  <Link
                    to="/admin/dashboard"
                    className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-bold text-yellow-400 hover:bg-gray-800"
                    onClick={closeMenu}
                  >
                    <LayoutDashboard size={18} /> Admin Panel
                  </Link>
                )}

                {userInfo.role === "restaurant_owner" && (
                  <Link
                    to="/restaurant/dashboard"
                    className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-bold text-green-400 hover:bg-gray-800"
                    onClick={closeMenu}
                  >
                    <ChefHat size={18} /> Kitchen Dashboard
                  </Link>
                )}

                {userInfo.role === "delivery_partner" && (
                  <Link
                    to="/delivery/dashboard"
                    className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-bold text-blue-400 hover:bg-gray-800"
                    onClick={closeMenu}
                  >
                    <Truck size={18} /> Delivery Dashboard
                  </Link>
                )}

                {userInfo.role === "user" && (
                  <Link
                    to="/myorders"
                    className="flex items-center gap-2 px-3 py-3 rounded-md text-base font-medium text-gray-300 hover:bg-gray-800"
                    onClick={closeMenu}
                  >
                    <Package size={18} /> My Orders
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-800 hover:text-primary"
                  onClick={closeMenu}
                >
                  Profile ({userInfo.name})
                </Link>

                <button
                  onClick={logoutHandler}
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-md text-base font-bold text-red-500 hover:bg-gray-800"
                >
                  <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Link
                  to="/login"
                  className="text-center py-2 border border-gray-600 rounded-lg font-bold hover:bg-gray-800 text-white"
                  onClick={closeMenu}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-center py-2 bg-primary text-white rounded-lg font-bold hover:bg-red-700"
                  onClick={closeMenu}
                >
                  Sign Up
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
