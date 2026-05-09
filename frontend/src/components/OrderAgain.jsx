import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RotateCcw, Loader2 } from "lucide-react";
import { BASEURL } from "../config";
import { toast } from "react-hot-toast";

const OrderAgain = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { userInfo: user } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchFrequent = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASEURL}/api/v1/reorder/frequent`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setItems(data.frequentItems || []);
      } catch {
        // silent fail — non-critical
      } finally {
        setLoading(false);
      }
    };
    fetchFrequent();
  }, [user]);

  const handleReorder = (item) => {
    if (item.restaurant) {
      navigate(`/restaurant/${item.restaurant}`);
    } else {
      toast("Restaurant no longer available");
    }
  };

  if (!user || items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <RotateCcw size={20} className="text-primary" />
        Order <span className="text-primary">Again</span>
      </h2>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <button
              key={item.product}
              onClick={() => handleReorder(item)}
              className="group text-left bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden hover:shadow-md transition-all duration-200"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={item.image || "/placeholder-food.jpg"}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Ordered {item.totalOrderedQty}x
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderAgain;
