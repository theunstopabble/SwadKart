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
  XCircle,
} from "lucide-react";
import { BASEURL } from "../config";
import { addToCart, clearCart } from "../redux/cartSlice";
import { toast } from "react-hot-toast";

const MyOrders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);
  const { cartItems } = useSelector((state) => state.cart);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userInfo) {
      navigate("/login");
    } else {
      // NEW-01 FIX: Handle paginated response from backend { data: [], metadata: {} }
      const fetchOrders = async () => {
        try {
          const res = await fetch(`${BASEURL}/api/v1/orders/myorders`, {
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            const ordersArray = Array.isArray(data) ? data : data.data || [];
            setOrders(
              ordersArray.sort(
                (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
              ),
            );
          }
        } catch {
          toast.error("Failed to load orders");
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [userInfo, navigate]);

  const handleReorder = (order) => {
    try {
      const orderRestaurantId = order.orderItems[0]?.restaurant;
      if (
        cartItems.length > 0 &&
        orderRestaurantId &&
        cartItems[0].restaurant?.toString() !== orderRestaurantId?.toString()
      ) {
        const confirmed = window.confirm(
          "Your cart has items from another restaurant. Reordering will clear your current cart. Continue?",
        );
        if (!confirmed) return;
        dispatch(clearCart());
      }

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
          }),
        );
      });
      toast.success("Order items added to cart! 🎉");
      navigate("/cart");
    } catch {
      toast.error("Failed to re-order");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-28 px-4 pb-20 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 px-2">
          <div>
            <h1 className="text-5xl font-extrabold uppercase italic tracking-tighter flex items-center gap-4">
              My <span className="text-primary">History</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-3 ml-1">
              Tracking your delicious journeys
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl shadow-lg">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
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
            <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-6 animate-pulse">
              Syncing your kitchen...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 bg-gray-900 rounded-2xl border border-gray-800 px-6 shadow-2xl">
            <div className="w-24 h-24 bg-black/50 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <ShoppingBag className="text-gray-600" size={40} />
            </div>
            <h3 className="text-2xl font-extrabold text-white uppercase italic tracking-tight">
              You haven't ordered yet!
            </h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-3">
              Hungry? Your first meal is just a click away.
            </p>
            <Link
              to="/"
              className="mt-10 inline-flex items-center gap-3 bg-primary hover:bg-red-600 text-white px-10 py-4 rounded-xl font-extrabold uppercase text-xs tracking-widest transition-all shadow-lg shadow-primary/25 active:scale-95"
            >
              Order Now <ChevronRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-10">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden transition-all duration-500 hover:border-primary/40 group shadow-2xl"
              >
                <div className="p-8">
                  {/* Order Status Header */}
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div className="space-y-1">
                      <span className="bg-black/50 text-gray-400 px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-[0.2em] border border-gray-800">
                        ID:{" "}
                        {order._id
                          ? order._id.substring(order._id.length - 10).toUpperCase()
                          : "N/A"}
                      </span>
                      <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold mt-3">
                        <Clock size={14} className="text-primary" />
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Payment Status Badge */}
                      <div
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-widest border ${
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
                        {order.isPaid ? "Paid" : "Pending"}
                      </div>
                      {/* Delivery Status Badge */}
                      <div
                        className={`px-4 py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-widest border ${
                          order.isDelivered
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        }`}
                      >
                        {order.isDelivered ? "Delivered" : "Processing"}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-black/50 rounded-xl border border-gray-800 p-6 mb-8 divide-y divide-gray-800/50">
                    {(order.orderItems || []).map((item, index) => (
                      <div
                        key={index}
                        className="py-4 first:pt-0 last:pb-0 flex justify-between items-center group/item"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={item.image || "https://placehold.co/56"}
                            alt={item.name || "Item"}
                            className="w-14 h-14 rounded-xl object-cover grayscale group-hover/item:grayscale-0 transition-all border border-gray-800"
                          />
                          <div>
                            <p className="text-sm font-extrabold uppercase italic tracking-tight text-gray-200">
                              {item.name || "Unknown Item"}
                              <span className="text-primary ml-2 lowercase">
                                x{(item.qty ?? 0)}
                              </span>
                            </p>
                            <div className="flex gap-2 mt-1.5">
                              {item.selectedVariant && (
                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                                  Size: {item.selectedVariant.name || item.selectedVariant}
                                </span>
                              )}
                              {item.selectedAddons?.length > 0 && (
                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                                  Extras: {item.selectedAddons.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-sm font-extrabold italic tracking-tighter text-white">
                          ₹{((item.price ?? 0) * (item.qty ?? 0)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      to={`/order/${order._id}`}
                      className="flex-1 bg-white hover:bg-primary text-black hover:text-white py-4 rounded-xl font-extrabold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-white/5"
                    >
                      Track Order <ArrowRight size={16} />
                    </Link>

                    <button
                      onClick={() => handleReorder(order)}
                      className="px-10 py-4 bg-black/40 hover:bg-gray-800 border border-gray-800 rounded-xl text-[10px] font-extrabold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] group/btn"
                    >
                      <RotateCcw
                        size={16}
                        className="group-hover/btn:rotate-180 transition-transform duration-700"
                      />
                      Re-Order
                    </button>

                    {/* 🛡️ Cancel Order Button */}
                    {(order.orderStatus === "Placed" || order.orderStatus === "Preparing") && (
                      <button
                        onClick={async () => {
                          if (!window.confirm("Are you sure you want to cancel this order?")) return;
                          try {
                            const res = await fetch(`${BASEURL}/api/v1/orders/${order._id}/cancel`, {
                              method: "PUT",
                              credentials: "include",
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setOrders((prev) =>
                                prev.map((o) => (o._id === order._id ? data : o)),
                              );
                              toast.success("Order cancelled successfully");
                            } else {
                              toast.error(data.message || "Cannot cancel order");
                            }
                          } catch {
                            toast.error("Cancel request failed");
                          }
                        }}
                        className="px-6 py-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 rounded-xl text-[10px] font-extrabold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        <XCircle size={16} />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Bar Price */}
                <div className="bg-black/30 px-8 py-5 flex justify-between items-center border-t border-gray-800">
                  <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gray-500">
                    Grand Total
                  </span>
                  <span className="text-2xl font-extrabold italic tracking-tighter text-primary">
                    ₹{(order.totalPrice ?? 0).toFixed(2)}
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
