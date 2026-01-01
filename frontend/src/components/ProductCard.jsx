import React from "react";
import { Plus, Star } from "lucide-react";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import { toast } from "react-hot-toast"; // Feedback ke liye

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();

  const handleAddToCart = () => {
    if (product.countInStock > 0) {
      dispatch(addToCart({ ...product, qty: 1 }));
      toast.success("Added to cart");
    } else {
      toast.error("Item is currently out of stock");
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:-translate-y-2 border border-gray-800 group h-full flex flex-col">
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110 ${
            product.countInStock === 0 ? "grayscale opacity-50" : ""
          }`}
        />

        {/* 🚫 SOLD OUT OVERLAY (New Fix) */}
        {product.countInStock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <span className="text-red-500 font-black text-xl border-4 border-red-500 px-4 py-1 -rotate-12 uppercase tracking-widest shadow-xl backdrop-blur-sm">
              Sold Out
            </span>
          </div>
        )}

        {/* Rating (Top Right) */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm z-20">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          {product.rating || 0}
        </div>

        {/* Veg/Non-Veg Badge (Top Left) */}
        <span
          className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-extrabold tracking-wider shadow-md z-20 ${
            product.isVeg
              ? "bg-green-600 text-white" // Veg -> Green
              : "bg-red-600 text-white" // Non-Veg -> Red
          }`}
        >
          {product.isVeg ? "VEG" : "NON-VEG"}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-white truncate w-3/4">
            {product.name}
          </h3>
          <span className="text-primary font-bold">₹{product.price}</span>
        </div>

        <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">
          {product.description}
        </p>

        <button
          onClick={handleAddToCart}
          disabled={product.countInStock === 0}
          className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${
            product.countInStock === 0
              ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700" // Disabled Style
              : "bg-gray-800 hover:bg-primary text-white group-hover:bg-primary cursor-pointer active:scale-95 shadow-md" // Active Style
          }`}
        >
          {product.countInStock === 0 ? (
            <span className="font-bold">OUT OF STOCK</span>
          ) : (
            <>
              Add to Cart <Plus size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
