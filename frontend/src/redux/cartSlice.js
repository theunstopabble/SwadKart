import { createSlice } from "@reduxjs/toolkit";

// ==========================================
// ==========================================
// 🛒 LocalStorage Utility
// ==========================================
const browserStorage = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage error", e);
    }
  },
  getItem: (key) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
  },
};

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
  browserStorage.setItem("cartItems", cartItems);
};

const initialState = {
  cartItems: browserStorage.getItem("cartItems") || [],
  shippingAddress: browserStorage.getItem("shippingAddress") || {},
  paymentMethod: browserStorage.getItem("paymentMethod") || "Online",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const productId = item.product || item._id;
      const restaurantId =
        typeof item.restaurant === "object"
          ? item.restaurant._id
          : item.restaurant;

      if (state.cartItems.length > 0) {
        const existingRestaurantId = state.cartItems[0].restaurant;
        if (
          existingRestaurantId &&
          restaurantId &&
          existingRestaurantId !== restaurantId
        ) {
          state.cartItems = [];
          updateCartStorage([]);
        }
      }

      const itemWithCorrectId = {
        ...item,
        product: productId,
        restaurant: restaurantId,
        cartUniqueId: generateCartId(item),
      };

      const existItem = state.cartItems.find(
        (x) => x.cartUniqueId === itemWithCorrectId.cartUniqueId,
      );

      if (existItem) {
        state.cartItems = state.cartItems.map((x) =>
          x.cartUniqueId === existItem.cartUniqueId ? itemWithCorrectId : x,
        );
      } else {
        state.cartItems = [...state.cartItems, itemWithCorrectId];
      }

      updateCartStorage(state.cartItems);
    },

    removeFromCart: (state, action) => {
      const idToRemove = action.payload;
      state.cartItems = state.cartItems.filter(
        (x) => x.cartUniqueId !== idToRemove,
      );
      updateCartStorage(state.cartItems);
    },

    saveShippingAddress: (state, action) => {
      state.shippingAddress = action.payload;
      browserStorage.setItem("shippingAddress", action.payload);
    },

    savePaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
      browserStorage.setItem("paymentMethod", action.payload);
    },

    clearCart: (state) => {
      state.cartItems = [];
      browserStorage.removeItem("cartItems");
    },

    logout: (state) => {
      state.cartItems = [];
      state.shippingAddress = null;
      state.paymentMethod = "";
      browserStorage.removeItem("cartItems");
      browserStorage.removeItem("shippingAddress");
      browserStorage.removeItem("paymentMethod");
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  saveShippingAddress,
  savePaymentMethod,
  clearCart,
  logout
} = cartSlice.actions;

export default cartSlice.reducer;
