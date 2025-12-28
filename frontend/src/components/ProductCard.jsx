import { Plus, Star } from "lucide-react";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/cartSlice";

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();

  const handleAddToCart = () => {
    dispatch(addToCart(product));
  };

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:-translate-y-2 border border-gray-800 group">
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />

        {/* Rating (Top Right) */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          {product.rating}
        </div>

        {/* 👇 NEW: Veg/Non-Veg Badge (Top Left) */}
        <span
          className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-extrabold tracking-wider shadow-md ${
            product.isVeg
              ? "bg-green-600 text-white" // Veg -> Green
              : "bg-red-600 text-white" // Non-Veg -> Red
          }`}
        >
          {product.isVeg ? "VEG" : "NON-VEG"}
        </span>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-white truncate w-3/4">
            {product.name}
          </h3>
          <span className="text-primary font-bold">₹{product.price}</span>
        </div>

        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {product.description}
        </p>

        <button
          onClick={handleAddToCart}
          className="w-full bg-gray-800 hover:bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors group-hover:bg-primary cursor-pointer active:scale-95"
        >
          Add to Cart <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
