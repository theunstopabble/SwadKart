import { createSlice } from "@reduxjs/toolkit";

// ==========================================
// 🛠️ HELPER: Generate Unique ID based on Customization
// ==========================================
const generateCartId = (item) => {
  const id = item.product || item._id; // Ensure we get the ID
  const variantPart = item.selectedVariant
    ? `-${item.selectedVariant.name}`
    : "";
  const addonPart =
    item.selectedAddons && item.selectedAddons.length > 0
      ? `-${item.selectedAddons
          .map((a) => a.name)
          .sort()
          .join("-")}`
      : "";
  return `${id}${variantPart}${addonPart}`;
};

// ==========================================
// 🛠️ HELPER: Update LocalStorage
// ==========================================
const updateCartStorage = (cartItems) => {
  localStorage.setItem("cartItems", JSON.stringify(cartItems));
};

const initialState = {
  cartItems: localStorage.getItem("cartItems")
    ? JSON.parse(localStorage.getItem("cartItems"))
    : [],

  shippingAddress: localStorage.getItem("shippingAddress")
    ? JSON.parse(localStorage.getItem("shippingAddress"))
    : {},

  paymentMethod: localStorage.getItem("paymentMethod")
    ? JSON.parse(localStorage.getItem("paymentMethod"))
    : "Online",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // ✅ ADD TO CART (With Product ID Fix)
    addToCart: (state, action) => {
      const item = action.payload;

      // 🛠️ CRITICAL FIX: Backend needs 'product' field (the ID).
      // Ensuring it's set from either item.product or item._id
      const productId = item.product || item._id;

      const itemWithCorrectId = {
        ...item,
        product: productId, // Required by Backend OrderModel
        cartUniqueId: generateCartId(item),
      };

      const existItem = state.cartItems.find(
        (x) => x.cartUniqueId === itemWithCorrectId.cartUniqueId
      );

      if (existItem) {
        state.cartItems = state.cartItems.map((x) =>
          x.cartUniqueId === existItem.cartUniqueId ? itemWithCorrectId : x
        );
      } else {
        state.cartItems = [...state.cartItems, itemWithCorrectId];
      }

      updateCartStorage(state.cartItems);
    },

    // ✅ REMOVE FROM CART
    removeFromCart: (state, action) => {
      const idToRemove = action.payload; // This is cartUniqueId
      state.cartItems = state.cartItems.filter(
        (x) => x.cartUniqueId !== idToRemove
      );
      updateCartStorage(state.cartItems);
    },

    saveShippingAddress: (state, action) => {
      state.shippingAddress = action.payload;
      localStorage.setItem("shippingAddress", JSON.stringify(action.payload));
    },

    savePaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
      localStorage.setItem("paymentMethod", JSON.stringify(action.payload));
    },

    clearCart: (state) => {
      state.cartItems = [];
      localStorage.removeItem("cartItems");
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  saveShippingAddress,
  savePaymentMethod,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
