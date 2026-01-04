import React from "react";
import {
  User,
  MapPin,
  Phone,
  Truck,
  CookingPot,
  Check,
  Clock,
  Printer,
  ChefHat,
} from "lucide-react";
import { generateInvoice } from "../../utils/invoiceGenerator";

const LiveOrders = ({
  orders,
  deliveryPartners,
  selectedPartner,
  setSelectedPartner,
  handleAssignPartner,
  handleStatusUpdate,
}) => {
  // 🛡️ CRASH FIX: Check if orders is an array before filtering
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Filter only active orders (Not Delivered/Cancelled)
  const activeOrders = safeOrders.filter(
    (o) => o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled"
  );

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
        <CookingPot className="text-primary" /> Active Kitchen Orders (
        {activeOrders.length})
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeOrders.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-gray-900/50 rounded-3xl border border-gray-800 border-dashed">
            <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="text-gray-500" size={32} />
            </div>
            <p className="text-gray-500 italic text-lg">
              Kitchen is quiet... Waiting for orders 🍕
            </p>
          </div>
        ) : (
          activeOrders.map((order) => (
            <div
              key={order._id}
              className="bg-gray-900 border border-gray-800 rounded-3xl p-6 hover:border-primary/30 transition-all shadow-xl relative overflow-hidden"
            >
              {/* Status Badge */}
              <div className="absolute top-0 right-0 bg-gray-800 px-4 py-2 rounded-bl-2xl text-xs font-black uppercase tracking-widest text-primary border-l border-b border-gray-700">
                {order.orderStatus}
              </div>

              {/* 🖨️ PRINT BUTTON */}
              <button
                onClick={() => generateInvoice(order)}
                className="absolute top-0 left-0 bg-gray-800/50 hover:bg-white hover:text-black text-gray-400 p-2 rounded-br-2xl transition-all"
                title="Print Receipt"
              >
                <Printer size={16} />
              </button>

              {/* Header: ID & Address */}
              <div className="flex justify-between mb-4 border-b border-gray-800 pb-4">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    #{order._id.substring(0, 6).toUpperCase()}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-white font-bold flex items-center gap-2">
                      <User size={14} className="text-primary" />{" "}
                      {order.shippingAddress?.fullName}
                    </p>
                    <p className="text-gray-400 flex items-start gap-2 text-xs">
                      <MapPin size={14} className="text-primary shrink-0" />{" "}
                      {order.shippingAddress?.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* 📋 ORDER ITEMS */}
              <div className="space-y-3 mb-6 bg-black/40 p-4 rounded-xl border border-gray-800">
                {order.orderItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start text-sm"
                  >
                    <div>
                      <span className="font-bold text-white">
                        {item.qty}x {item.name}
                      </span>
                      {/* Variant */}
                      {item.selectedVariant && (
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Size: {item.selectedVariant.name}
                        </div>
                      )}
                      {/* Addons */}
                      {item.selectedAddons &&
                        item.selectedAddons.length > 0 && (
                          <div className="text-[10px] text-primary mt-0.5">
                            +{" "}
                            {item.selectedAddons.map((a) => a.name).join(", ")}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ⚡ ACTION BUTTONS */}
              <div className="flex flex-col gap-3">
                {/* Step 1: Accept/Prepare */}
                {order.orderStatus === "Placed" && (
                  <button
                    onClick={() => handleStatusUpdate(order._id, "Preparing")}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <CookingPot size={18} /> Start Preparing
                  </button>
                )}

                {/* Step 2: Mark Ready */}
                {order.orderStatus === "Preparing" && (
                  <button
                    onClick={() => handleStatusUpdate(order._id, "Ready")}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Check size={18} /> Mark Food Ready
                  </button>
                )}

                {/* Step 3: Assign Driver (When Ready) */}
                {order.orderStatus === "Ready" && !order.deliveryPartner && (
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-black border border-gray-700 text-white p-3 rounded-xl text-xs outline-none focus:border-primary"
                      onChange={(e) =>
                        setSelectedPartner({
                          ...selectedPartner,
                          [order._id]: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Delivery Partner</option>
                      {deliveryPartners.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignPartner(order._id)}
                      className="bg-primary hover:bg-red-600 text-white px-4 rounded-xl font-bold text-xs transition-all"
                    >
                      Assign
                    </button>
                  </div>
                )}

                {/* Step 4: Out for Delivery Info */}
                {order.deliveryPartner && (
                  <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-green-400 text-xs text-center font-bold italic flex items-center justify-center gap-2">
                    <Truck size={14} /> {order.deliveryPartner.name} assigned
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default LiveOrders;
