import { createSlice } from "@reduxjs/toolkit";

// ==========================================
// 🛠️ HELPER: Generate Unique ID based on Customization
// ==========================================
// This ensures that items with different variants or addons are treated as separate entries.
const generateCartId = (item) => {
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
  return `${item._id}${variantPart}${addonPart}`;
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
    // ✅ ADD TO CART (With Variant Logic)
    addToCart: (state, action) => {
      const item = action.payload;

      // 1. Generate Unique ID
      const uniqueId = generateCartId(item);

      // 2. Attach this ID to the item object
      const itemWithId = { ...item, cartUniqueId: uniqueId };

      // 3. Check if this EXACT combination exists using the unique ID
      const existItem = state.cartItems.find(
        (x) => x.cartUniqueId === uniqueId
      );

      if (existItem) {
        // Update existing item
        state.cartItems = state.cartItems.map((x) =>
          x.cartUniqueId === existItem.cartUniqueId ? itemWithId : x
        );
      } else {
        // Add new item
        state.cartItems = [...state.cartItems, itemWithId];
      }

      localStorage.setItem("cartItems", JSON.stringify(state.cartItems));
    },

    // ✅ REMOVE FROM CART (Using Unique ID)
    removeFromCart: (state, action) => {
      // The payload must be 'cartUniqueId' to accurately target the correct item variant
      const idToRemove = action.payload;

      state.cartItems = state.cartItems.filter(
        (x) => x.cartUniqueId !== idToRemove
      );

      localStorage.setItem("cartItems", JSON.stringify(state.cartItems));
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
