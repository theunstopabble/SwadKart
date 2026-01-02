import React from "react";
import { User, MapPin, Phone, Truck, CookingPot } from "lucide-react";

const LiveOrders = ({
  orders,
  deliveryPartners,
  selectedPartner,
  setSelectedPartner,
  handleAssignPartner,
}) => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
        <CookingPot className="text-primary" /> Live Orders
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-20 text-gray-500 italic">
            No Active Orders Found.
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order._id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-primary/30 transition-all"
            >
              <div className="flex justify-between mb-4 border-b border-gray-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    #{order._id.substring(0, 6)}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-white font-bold flex items-center gap-2">
                      <User size={14} className="text-primary" />{" "}
                      {order.shippingAddress?.fullName}
                    </p>
                    <p className="text-gray-400 flex items-start gap-2">
                      <MapPin size={14} className="text-primary shrink-0" />{" "}
                      {order.shippingAddress?.address}
                    </p>
                    <p className="text-primary font-bold bg-primary/10 w-fit px-3 py-1 rounded-lg border border-primary/20 flex items-center gap-2">
                      <Phone size={14} /> {order.shippingAddress?.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ₹{order.totalPrice}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 italic">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Assign Partner logic inside order card */}
              {!order.isDelivered && !order.deliveryPartner && (
                <div className="flex gap-2">
                  <select
                    className="flex-1 bg-black border border-gray-700 text-white p-2 rounded-lg text-sm"
                    onChange={(e) =>
                      setSelectedPartner({
                        ...selectedPartner,
                        [order._id]: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Partner</option>
                    {deliveryPartners.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssignPartner(order._id)}
                    className="bg-primary px-4 py-2 rounded-lg font-bold text-xs"
                  >
                    Assign
                  </button>
                </div>
              )}
              {order.deliveryPartner && (
                <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg text-green-400 text-xs text-center font-bold italic flex items-center justify-center gap-2">
                  <Truck size={14} /> {order.deliveryPartner.name} is handling
                  delivery
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default LiveOrders;
