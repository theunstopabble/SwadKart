import React from "react";

const OrderItemCard = ({ item }) => (
  <div className="flex justify-between items-center bg-black/40 p-5 rounded-[1.5rem] border border-gray-900 group hover:border-primary/30 transition-all">
    <div className="flex gap-4 items-center">
      <img
        src={item.image}
        className="w-16 h-16 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
        alt={item.name}
      />
      <div className="flex flex-col">
        <span className="text-sm font-black uppercase italic text-gray-200 group-hover:text-white transition-colors">
          {item.name}{" "}
          <span className="text-primary font-black ml-1 text-xs">
            x{item.qty}
          </span>
        </span>
        <div className="flex flex-wrap gap-2 mt-2">
          {item.selectedVariant && (
            <span className="text-[8px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase border border-blue-500/20 italic tracking-widest">
              Size: {item.selectedVariant.name}
            </span>
          )}
          {item.selectedAddons?.map((a, idx) => (
            <span
              key={idx}
              className="text-[8px] font-black bg-green-500/10 text-green-400 px-2 py-0.5 rounded uppercase border border-green-500/20 italic tracking-widest"
            >
              + {a.name}
            </span>
          ))}
        </div>
      </div>
    </div>
    <span className="text-lg font-black italic tracking-tighter text-white">
      ₹{item.price * item.qty}
    </span>
  </div>
);

export default OrderItemCard;
