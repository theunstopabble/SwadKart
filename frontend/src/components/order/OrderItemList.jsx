const OrderItemList = ({ items }) => (
  <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-900">
    <h2 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
      <div className="h-8 w-1 bg-primary rounded-full"></div> Order Items
    </h2>
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-black/40 rounded-3xl border border-gray-900 group hover:border-primary/30 transition-all"
        >
          <div className="flex items-center gap-4">
            <img
              src={item.image}
              alt={item.name}
              className="w-16 h-16 object-cover rounded-2xl border border-gray-800"
            />
            <div>
              <p className="text-white font-black uppercase text-xs tracking-tight">
                {item.name}
              </p>
              <div className="text-[10px] text-gray-400 mt-1">
                {item.selectedVariant && (
                  <p className="text-primary font-bold">
                    Size: {item.selectedVariant.name}
                  </p>
                )}
                {item.selectedAddons?.length > 0 && (
                  <p className="text-gray-500">
                    Extras: {item.selectedAddons.map((a) => a.name).join(", ")}
                  </p>
                )}
                <p className="text-gray-500 font-bold mt-1 uppercase italic tracking-widest">
                  {item.qty} units × ₹{item.price}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-black italic text-lg tracking-tighter">
              ₹{item.qty * item.price}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default OrderItemList;
