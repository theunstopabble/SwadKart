import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  Clock,
  ArrowRight,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { BASE_URL } from "../config";
import { addToCart } from "../redux/cartSlice";
import { toast } from "react-hot-toast";

const MyOrders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userInfo) {
      navigate("/login");
    } else {
      const fetchOrders = async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/v1/orders/myorders`, {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          const data = await res.json();
          // Sort by latest first
          setOrders(
            data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          );
          setLoading(false);
        } catch (error) {
          toast.error("Failed to load orders");
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [userInfo, navigate]);

  const handleReorder = (order) => {
    try {
      order.orderItems.forEach((item) => {
        dispatch(
          addToCart({
            _id: item.product,
            name: item.name,
            image: item.image,
            price: item.price,
            qty: item.qty,
            restaurant: item.restaurant,
            selectedVariant: item.selectedVariant,
            selectedAddons: item.selectedAddons,
          })
        );
      });
      toast.success("Order items added to cart! 🎉");
      navigate("/cart");
    } catch (err) {
      toast.error("Failed to re-order");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-28 px-4 pb-20 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 px-2">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter flex items-center gap-4">
              My <span className="text-primary">History</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-2 ml-1">
              Tracking your delicious journeys
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-900/50 px-4 py-2 rounded-2xl border border-gray-800">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {orders.length} Orders Placed
            </span>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="h-16 w-16 border-t-4 border-primary rounded-full animate-spin"></div>
              <Package
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/50"
                size={20}
              />
            </div>
            <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] mt-6 animate-pulse">
              Syncing your kitchen...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 bg-gray-950 rounded-[3.5rem] border-2 border-dashed border-gray-900 px-6">
            <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShoppingBag className="text-gray-700" size={40} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
              You haven't ordered yet!
            </h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">
              Hungry? Your first meal is just a click away.
            </p>
            <Link
              to="/"
              className="mt-10 inline-flex items-center gap-3 bg-primary text-white px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
            >
              Order Now <ChevronRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-10">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-gray-950 border border-gray-900 rounded-[3rem] p-1 overflow-hidden transition-all duration-500 hover:border-primary/30 group shadow-2xl"
              >
                <div className="p-8">
                  {/* Order Status Header */}
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div className="space-y-1">
                      <span className="bg-gray-900 text-gray-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border border-gray-800">
                        #
                        {order._id
                          .substring(order._id.length - 10)
                          .toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold mt-2">
                        <Clock size={14} className="text-primary" />
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Paid Badge */}
                      <div
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${
                          order.isPaid
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {order.isPaid ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                        {order.isPaid ? "Payment Success" : "Payment Pending"}
                      </div>
                      {/* Delivery Status */}
                      <div
                        className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${
                          order.isDelivered
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        }`}
                      >
                        {order.isDelivered ? "Delivered" : "In Kitchen"}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-black/40 rounded-[2rem] border border-gray-900 p-6 mb-8 divide-y divide-gray-900/50">
                    {order.orderItems.map((item, index) => (
                      <div
                        key={index}
                        className="py-4 first:pt-0 last:pb-0 flex justify-between items-center group/item"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={item.image}
                            className="w-12 h-12 rounded-2xl object-cover grayscale group-hover/item:grayscale-0 transition-all"
                          />
                          <div>
                            <p className="text-sm font-black uppercase italic tracking-tight text-gray-200">
                              {item.name}{" "}
                              <span className="text-primary ml-1 lowercase">
                                x{item.qty}
                              </span>
                            </p>
                            <div className="flex gap-2 mt-1">
                              {item.selectedVariant && (
                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                  Size: {item.selectedVariant.name}
                                </span>
                              )}
                              {item.selectedAddons?.length > 0 && (
                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest border-l border-gray-800 pl-2">
                                  Extras: {item.selectedAddons.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-sm font-black italic tracking-tighter">
                          ₹{item.price * item.qty}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      to={`/order/${order._id}`}
                      className="flex-1 bg-white text-black hover:bg-primary hover:text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-white/5"
                    >
                      Track Details <ArrowRight size={16} />
                    </Link>

                    <button
                      onClick={() => handleReorder(order)}
                      className="px-8 py-5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 group"
                    >
                      <RotateCcw
                        size={16}
                        className="group-hover:rotate-180 transition-transform duration-500"
                      />{" "}
                      Re-Order
                    </button>
                  </div>
                </div>

                {/* Bottom Bar Price */}
                <div className="bg-gray-900/50 px-8 py-4 flex justify-between items-center border-t border-gray-900">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">
                    Order Value
                  </span>
                  <span className="text-xl font-black italic tracking-tighter text-white">
                    ₹{order.totalPrice}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
