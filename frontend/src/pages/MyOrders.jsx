import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Package, MapPin, Clock, ArrowRight, ShoppingBag } from "lucide-react";
import { BASE_URL } from "../config";

const MyOrders = () => {
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();

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
          setOrders(data);
          setLoading(false);
        } catch (error) {
          console.error(error);
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [userInfo, navigate]);

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-10 border-b border-gray-900 pb-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 italic">
            <Package className="text-primary" size={32} /> My{" "}
            <span className="text-primary">Orders</span>
          </h1>
          <div className="px-4 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-black uppercase">
            {orders.length} TOTAL
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
              Fetching your history...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/30 rounded-[3rem] border-2 border-dashed border-gray-800">
            <ShoppingBag className="mx-auto text-gray-800 mb-6" size={100} />
            <h3 className="text-2xl font-black text-gray-500 uppercase italic">
              Your plate is empty!
            </h3>
            <p className="text-gray-600 mt-2 font-bold">
              You haven't ordered any deliciousness yet.
            </p>
            <Link
              to="/"
              className="mt-8 inline-block bg-primary text-white px-10 py-4 rounded-2xl font-black hover:bg-red-600 transition-all transform active:scale-95 shadow-lg shadow-primary/20"
            >
              BROWSE RESTAURANTS
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-gray-950 border border-gray-900 rounded-[2.5rem] p-8 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(255,71,87,0.1)] group"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-primary font-mono text-sm font-black tracking-widest uppercase">
                        ID: #{order._id.substring(order._id.length - 8)}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Clock size={14} className="text-primary" />
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      |{" "}
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-3">
                    <span
                      className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest border uppercase ${
                        order.isPaid
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}
                    >
                      {order.isPaid ? "Payment Success" : "Payment Pending"}
                    </span>
                    <span
                      className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest border uppercase ${
                        order.isDelivered
                          ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(255,71,87,0.2)]"
                          : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      }`}
                    >
                      {order.isDelivered ? "Delivered" : "In Progress"}
                    </span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="bg-black/50 border border-gray-900 rounded-3xl p-6 mb-8">
                  <div className="space-y-4">
                    {order.orderItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center group/item"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center font-black text-primary text-xs border border-gray-800">
                            {item.qty}x
                          </div>
                          <span className="font-bold text-gray-300 group-hover/item:text-white transition-colors uppercase text-sm tracking-tight">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-mono text-white font-black text-sm">
                          ₹{item.price * item.qty}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-900 mt-6 pt-6 flex justify-between items-center">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
                      Total Value
                    </span>
                    <span className="text-2xl font-black text-white italic tracking-tighter">
                      ₹{order.totalPrice}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/order/${order._id}`}
                  className="w-full bg-white hover:bg-primary text-black hover:text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all duration-300 transform group-hover:-translate-y-1 shadow-xl uppercase tracking-widest text-xs"
                >
                  View Full Summary{" "}
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-2 transition-transform"
                  />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
