import { createSlice } from "@reduxjs/toolkit";

// ==========================================
// 🛠️ HELPER: Generate Unique ID
// ==========================================
const generateCartId = (item) => {
  const id = item.product || item._id;
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
    // ✅ ADD TO CART (FIXED FOR RESTAURANT ID)
    addToCart: (state, action) => {
      const item = action.payload;

      // 1. Fix Product ID
      const productId = item.product || item._id;

      // 2. 🔥 CRITICAL FIX: Ensure Restaurant ID is captured
      // Sometimes it comes as an object (populated) or a string. We need the ID string.
      const restaurantId =
        typeof item.restaurant === "object"
          ? item.restaurant._id
          : item.restaurant;

      const itemWithCorrectId = {
        ...item,
        product: productId,
        restaurant: restaurantId, // 👈 This links the order to the owner
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
      const idToRemove = action.payload;
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
