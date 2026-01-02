import React from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import { useDispatch } from "react-redux";
import { addToCart, removeFromCart } from "../../redux/cartSlice";

const CartItem = ({ item }) => {
  const dispatch = useDispatch();

  return (
    <div className="bg-gray-900 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-800 animate-in fade-in slide-in-from-left-4">
      <img
        src={item.image}
        alt={item.name}
        className="w-24 h-24 object-cover rounded-lg border border-gray-800"
      />

      <div className="flex-grow">
        <h3 className="text-lg font-bold text-white uppercase italic">
          {item.name}
        </h3>

        {/* Variants & Addons Display */}
        <div className="text-[10px] text-gray-400 mb-2 space-y-1 mt-1 font-bold uppercase tracking-widest">
          {item.selectedVariant && (
            <span className="bg-blue-500/10 px-2 py-0.5 rounded text-blue-400 border border-blue-500/20 mr-2">
              Size: {item.selectedVariant.name}
            </span>
          )}
          {item.selectedAddons?.map((addon, idx) => (
            <span
              key={idx}
              className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20 mr-1"
            >
              + {addon.name}
            </span>
          ))}
        </div>

        <p className="text-primary font-black text-lg italic">₹{item.price}</p>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
        <div className="flex items-center gap-3 bg-black/50 px-3 py-1 rounded-lg border border-gray-700">
          <button
            onClick={() => dispatch(addToCart({ ...item, qty: item.qty - 1 }))}
            disabled={item.qty === 1}
            className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <Minus size={16} />
          </button>
          <span className="font-black w-4 text-center text-sm">{item.qty}</span>
          <button
            onClick={() => dispatch(addToCart({ ...item, qty: item.qty + 1 }))}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          onClick={() => dispatch(removeFromCart(item._id))}
          className="bg-red-500/10 p-2.5 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default CartItem;
