import Order from "../models/orderModel.js";
import sendEmail from "../utils/sendEmail.js"; // 👈 ईमेल भेजने के लिए इम्पोर्ट किया

// =================================================================
// 🛒 ORDER CREATION & FETCHING
// =================================================================

// @desc    Create new order & Send Admin Alert Email
export const addOrderItems = async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  } else {
    const order = new Order({
      orderItems: orderItems.map((x) => ({
        ...x,
        product: x.product,
        _id: undefined,
      })),
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();

    // ==========================================
    // 📧 ADMIN EMAIL ALERT LOGIC (Start)
    // ==========================================
    const orderItemsHTML = orderItems
      .map(
        (item) =>
          `<li style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
        <strong style="color: #ff4757;">${item.name}</strong> <br/>
        Quantity: ${item.qty} | Price: ₹${item.price * item.qty}
      </li>`
      )
      .join("");

    try {
      await sendEmail({
        email: "swadkartt@gmail.com", // 👈 आपका ईमेल यहाँ फिक्स कर दिया है
        subject: `🚨 NEW ORDER RECEIVED: SwadKart #${createdOrder._id
          .toString()
          .slice(-6)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #ddd; border-radius: 15px; overflow: hidden;">
            <div style="background: #000; padding: 20px; text-align: center;">
              <h1 style="color: #ff4757; margin: 0;">SwadKart</h1>
              <p style="color: #fff; margin: 0; font-size: 12px; letter-spacing: 2px;">NEW ORDER ALERT</p>
            </div>
            <div style="padding: 30px;">
              <h2 style="border-bottom: 2px solid #ff4757; padding-bottom: 10px;">Order Summary</h2>
              <p><strong>Customer Name:</strong> ${req.user.name}</p>
              <p><strong>Total Bill:</strong> <span style="font-size: 20px; color: #ff4757; font-weight: bold;">₹${totalPrice}</span></p>
              <p><strong>Payment Mode:</strong> ${paymentMethod}</p>
              
              <h3 style="margin-top: 20px;">DISHES:</h3>
              <ul style="list-style: none; padding: 0;">${orderItemsHTML}</ul>
              
              <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-top: 20px;">
                <h3 style="margin-top: 0;">Delivery To:</h3>
                <p style="margin: 0; font-size: 14px;">
                  ${shippingAddress.address}, <br/>
                  ${shippingAddress.city}, ${shippingAddress.postalCode} <br/>
                  <strong>📞 Phone: ${shippingAddress.phone}</strong>
                </p>
              </div>
              
              <a href="https://swadkart-pro.vercel.app/admin/dashboard" 
                 style="display: block; text-align: center; background: #ff4757; color: #fff; padding: 15px; text-decoration: none; border-radius: 10px; margin-top: 30px; font-weight: bold;">
                 OPEN ADMIN DASHBOARD
              </a>
            </div>
            <div style="background: #eee; padding: 15px; text-align: center; font-size: 12px; color: #888;">
              This is an automated alert from SwadKart Server.
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send admin order alert:", emailErr);
    }
    // ==========================================
    // 📧 ADMIN EMAIL ALERT LOGIC (End)
    // ==========================================

    res.status(201).json(createdOrder);
  }
};

// @desc    Get order by ID
export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("deliveryPartner", "name phone");

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// @desc    Get logged in user orders
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(orders);
};

// =================================================================
// 🚚 STATUS UPDATES & REAL-TIME SOCKETS ⚡
// =================================================================

export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    order.orderStatus = status;
    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
    const updatedOrder = await order.save();
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    req.io.emit("globalOrderUpdate", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

export const updateOrderToPaid = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };
    const updatedOrder = await order.save();
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

export const updateOrderToDelivered = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.orderStatus = "Delivered";
    const updatedOrder = await order.save();
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

export const assignDeliveryPartner = async (req, res) => {
  const { deliveryPartnerId } = req.body;
  const order = await Order.findById(req.params.id);
  if (order) {
    order.deliveryPartner = deliveryPartnerId;
    order.orderStatus = "Out for Delivery";
    const updatedOrder = await order.save();
    req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
};

// =================================================================
// 👑 ADMIN & PARTNER ROUTES
// =================================================================

export const getAllOrdersAdmin = async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "id name")
    .populate("deliveryPartner", "name")
    .sort({ createdAt: -1 });
  res.json(orders);
};

export const getOrders = async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "id name")
    .populate("deliveryPartner", "name")
    .sort({ createdAt: -1 });
  res.json(orders);
};

export const getMyDeliveryOrders = async (req, res) => {
  const orders = await Order.find({ deliveryPartner: req.user._id })
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });
  res.json(orders);
};
