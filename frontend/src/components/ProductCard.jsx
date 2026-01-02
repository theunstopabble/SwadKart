import React from "react";
import { Plus } from "lucide-react";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import { toast } from "react-hot-toast";
import Rating from "./Rating"; // 👈 Rating component import kiya

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();

  const handleAddToCart = () => {
    if (product.countInStock > 0) {
      dispatch(addToCart({ ...product, qty: 1 }));
      toast.success(`${product.name} added to cart! 🛒`);
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

        {/* 🚫 SOLD OUT OVERLAY */}
        {product.countInStock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <span className="text-red-500 font-black text-xl border-4 border-red-500 px-4 py-1 -rotate-12 uppercase tracking-widest shadow-xl backdrop-blur-sm">
              Sold Out
            </span>
          </div>
        )}

        {/* Veg/Non-Veg Badge */}
        <span
          className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-extrabold tracking-wider shadow-md z-20 ${
            product.isVeg ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {product.isVeg ? "VEG" : "NON-VEG"}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-lg font-bold text-white truncate w-3/4">
            {product.name}
          </h3>
          <span className="text-primary font-bold">₹{product.price}</span>
        </div>

        {/* ⭐ RATINGS SECTION (Updated with Stars) */}
        <div className="mb-3">
          <Rating
            value={product.rating}
            text={`(${product.numReviews || 0})`}
          />
        </div>

        <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">
          {product.description}
        </p>

        <button
          onClick={handleAddToCart}
          disabled={product.countInStock === 0}
          className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${
            product.countInStock === 0
              ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
              : "bg-gray-800 hover:bg-primary text-white group-hover:bg-primary cursor-pointer active:scale-95 shadow-md"
          }`}
        >
          {product.countInStock === 0 ? (
            <span className="font-bold uppercase tracking-widest text-xs">
              Out of Stock
            </span>
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
