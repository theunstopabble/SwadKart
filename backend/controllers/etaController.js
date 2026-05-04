// ============================================================
// ⏰ DELIVERY ETA ENGINE (FEAT-12)
// ============================================================
// Calculates dynamic estimated delivery time based on order state,
// preparation time, and delivery distance.
//
// Formula: ETA = now + prepTime + travelTime + buffer
// ============================================================

/**
 * Calculate preparation time based on item count and complexity.
 * Base: 10 min, +2 min per item, capped at 45 min.
 */
const calculatePrepTime = (itemCount) => {
  const base = 10;
  const perItem = 2;
  const max = 45;
  return Math.min(base + itemCount * perItem, max);
};

/**
 * Calculate travel time in minutes.
 * For enterprise, this is a simplified model:
 * - If no distance data: assume 15-25 min based on city density
 * - Jaipur avg: ~20 min for 3-5 km radius
 */
const calculateTravelTime = (distanceKm = null) => {
  if (distanceKm && distanceKm > 0) {
    // ~15 km/h avg in city traffic => 4 min per km
    return Math.ceil(distanceKm * 4);
  }
  // Default fallback for Jaipur city
  return 20;
};

/**
 * Add safety buffer based on time of day (traffic).
 * Peak hours (12-14, 19-22): +10 min buffer
 */
const calculateBuffer = () => {
  const hour = new Date().getHours();
  const isPeak = (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 22);
  return isPeak ? 10 : 5;
};

/**
 * Main ETA calculation.
 * @param {Object} order - Mongoose order document (needs orderItems, shippingAddress)
 * @returns {Date} estimatedDeliveryAt
 * @returns {Number} estimatedMinutes
 */
export const calculateOrderETA = (order) => {
  const itemCount = order.orderItems?.length || 1;
  const prepTime = calculatePrepTime(itemCount);
  const travelTime = calculateTravelTime(order.distanceKm);
  const buffer = calculateBuffer();

  const estimatedMinutes = prepTime + travelTime + buffer;
  const estimatedDeliveryAt = new Date(Date.now() + estimatedMinutes * 60000);

  return { estimatedDeliveryAt, estimatedMinutes, prepTime, travelTime, buffer };
};

/**
 * Recalculate ETA when status changes (e.g., driver assigned, out for delivery).
 * Uses remaining time + actual progress.
 */
export const recalculateETA = (order, statusChangeReason = "") => {
  let estimatedMinutes = 0;

  switch (order.deliveryStatus) {
    case "Assigned":
      // Driver just assigned: full cycle minus some prep time (assume 50% done)
      estimatedMinutes = calculatePrepTime(order.orderItems?.length || 1) * 0.5 + calculateTravelTime(order.distanceKm) + calculateBuffer();
      break;
    case "Accepted":
      // Driver accepted: prep may be done, mostly travel time
      estimatedMinutes = calculateTravelTime(order.distanceKm) + calculateBuffer();
      break;
    case "Out for Delivery":
      // Already en route: mostly travel time, less buffer
      estimatedMinutes = calculateTravelTime(order.distanceKm) + 3;
      break;
    default:
      // Fallback to full calculation
      estimatedMinutes = calculateOrderETA(order).estimatedMinutes;
  }

  const estimatedDeliveryAt = new Date(Date.now() + estimatedMinutes * 60000);

  return {
    estimatedDeliveryAt,
    estimatedMinutes: Math.ceil(estimatedMinutes),
    reason: statusChangeReason,
  };
};
