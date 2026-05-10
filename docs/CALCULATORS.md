# SwadKart Enterprise Calculators

Enterprise-grade calculators for restaurant owners, delivery partners, and admin operators. Each calculator provides real-time data, projections, and actionable insights.

---

## Overview

| Calculator | Purpose | Target Users |
|-----------|---------|-------------|
| Food Cost Calculator | Ingredient-level cost & margin analysis | Restaurant Owners |
| Pricing Calculator | Commission breakdown & tier pricing | Restaurant Owners, Admin |
| Delivery Fee Calculator | Distance/time-based delivery pricing | Restaurant Owners, Admin |
| Reward Calculator | Loyalty tier earnings & redemption | Users, Restaurant Owners |
| Analytics Forecast | Revenue projection & demand trends | Restaurant Owners, Admin |
| Inventory Forecast | Stock predictions & reorder alerts | Restaurant Owners |
| Driver Earnings Calculator | Per-delivery earnings & incentives | Delivery Partners |

---

## 1. Food Cost Calculator

**Base URL:** `/api/v1/cost-calculator`

### Data Model

Each product now tracks ingredient-level cost data:

```javascript
Product {
  ingredients: [
    { name: "Mozzarella", quantity: 200, unit: "g", unitCost: 2.5 },
    { name: "Tomato Sauce", quantity: 100, unit: "ml", unitCost: 0.8 }
  ],
  foodCostPercentage: 30,  // Target food cost %
  preparationCost: 15,     // Labor cost per unit
  packagingCost: 5,         // Packaging cost per unit
  marginTarget: 25,        // Target profit margin %
  lastCostUpdated: Date
}
```

### Calculations

```
ingredientCost = Σ(ingredient.quantity × ingredient.unitCost)
totalCost = ingredientCost + preparationCost + packagingCost
suggestedPrice = totalCost / (1 - foodCostPercentage / 100)
profitAtCurrentPrice = currentPrice - totalCost
profitMarginAtCurrent = (profitAtCurrentPrice / currentPrice) × 100
```

### Margin Thresholds

| Status | Margin Condition |
|--------|-----------------|
| `healthy` | 10% ≤ margin < 40% AND price ≥ suggestedPrice × 0.9 |
| `low` | margin < 10% |
| `underpriced` | price < suggestedPrice × 0.9 |
| `overpriced` | price > suggestedPrice × 1.2 |

### Batch Calculation

For bulk order cost estimation:
```
grandTotalCost = totalIngredientCost + totalPreparationCost + totalPackagingCost
```

---

## 2. Pricing & Commission Calculator

**Base URL:** `/api/v1/pricing-calculator`

### Platform Commission Structure

```
Platform Fee Rate: 15% of netItemsValue
netItemsValue = itemsPrice - couponDiscount
restaurantPayout = netItemsValue - platformCommission
```

### Pricing Tiers

| Tier | Margin | Formula |
|------|--------|---------|
| Minimum | 9.09% | costPrice × 1.1 |
| Standard | 25% | costPrice / 0.75 |
| Premium | 35% | costPrice / 0.65 |
| Competitive | 15% | costPrice / 0.85 |
| With Surge | Dynamic | basePrice × surgeMultiplier |

### Market Pricing Analysis

Aggregates competitor data by category:
```
average = Σ prices / count
median = middle value of sorted prices
min = lowest price
max = highest price
```

Price distribution buckets: ₹0-100, ₹101-200, ₹201-300, ₹301-500, ₹500+

---

## 3. Delivery Fee Calculator

**Base URL:** `/api/v1/delivery-calculator`

### Fee Logic

```
Free Delivery Conditions:
  - hasSwadPass === true → FREE
  - orderSubtotal >= ₹500 → FREE

Paid Delivery:
  distanceSurcharge = min(distanceKm × 8, 50)
  baseWithDistance = baseFee (40) + distanceSurcharge
  if surgeMultiplier > 1 AND baseFee > 0:
    total = baseWithDistance × surgeMultiplier
  else:
    total = baseWithDistance
  Cap: maxDeliveryFee = ₹120
```

### Route Calculation (Haversine)

```
R = 6371 km
dLat = lat2 - lat1
dLng = lng2 - lng1
a = sin²(dLat/2) + cos(lat1) × cos(lat2) × sin²(dLng/2)
c = 2 × atan2(√a, √(1-a))
distanceKm = R × c
```

Vehicle speeds: bicycle=15 km/h, scooter=30 km/h, bike=45 km/h

### Earnings Projection

```
avgDeliveryFee = totalFees / deliveries
monthlyProjection = (deliveries / 30) × avgDeliveryFee × 30
```

---

## 4. Loyalty & Reward Calculator

**Base URL:** `/api/v1/rewards-calculator`

### Loyalty Tiers

| Tier | Coin Range | Earning Rate | Perks |
|------|-----------|--------------|-------|
| Bronze | 0-499 | 1× | Basic earning, Birthday bonus |
| Silver | 500-1999 | 1.5× | Priority support, 1.5x earning |
| Gold | 2000-4999 | 2× | Free delivery/month, Priority support, Exclusive deals |
| Platinum | 5000+ | 3× | Free delivery/week, Dedicated support, Early access |

### Coin Earning Formula

```
baseCoins = floor(orderAmount / 10)
earnedCoins = floor(baseCoins × earningRate)
```

### Coin Redemption Rules

```
Coins must be: positive, multiple of 100
Rate: ₹10 per 100 coins (₹0.10/coin)
Maximum discount: 50% of order value
Platform fee on redemption: 15% of remaining amount
restaurantPayout = finalAmount - platformFee
```

### Referral Reward Structure

| Role | Coins | Value |
|------|-------|-------|
| Referrer | 200 × tierMultiplier | ₹20 × tierMultiplier |
| Referee | 100 | ₹10 |

Tier multipliers: Bronze=1, Silver=1.5, Gold=2, Platinum=3

---

## 5. Analytics & Revenue Forecast

**Base URL:** `/api/v1/analytics-forecast`

### Revenue Projection

```
avgDailyRevenue = totalRevenue / days
revenueStdDev = √(Σ(revenue - avgDailyRevenue)² / days)
weeklyProjection = avgDailyRevenue × 7
monthlyProjection = avgDailyRevenue × 30
```

### 7-Day Forecast

Day-of-week multipliers applied to last 7 days average:
```
Sun: 0.6, Mon: 1.0, Tue: 0.9, Wed: 1.1, Thu: 1.2, Fri: 1.4, Sat: 1.3
```

### Order Volume Forecasting

```
avgDailyOrders = totalOrders / days
projectedNext7Days = avgDailyOrders × 7
projectedNext30Days = avgDailyOrders × 30
```

Peak hours: orders ≥ 5/hour
Off-peak hours: orders ≤ 2/hour

### Demand Analytics

```
fastMoving: quantitySold >= 10 in period
slowMoving: quantitySold <= 2 in period
```

---

## 6. Inventory Forecasting

**Base URL:** `/api/v1/inventory-forecast`

### Stockout Prediction

```
avgDailyDemand = soldInPeriod / periodDays
daysUntilStockout = currentStock / avgDailyDemand
suggestedReorderQty = ceil(avgDailyDemand × 14) - currentStock
```

### Status Classification

| Status | Condition | Action |
|--------|-----------|--------|
| `out_of_stock` | currentStock === 0 | Immediate restock |
| `critical` | daysUntilStockout ≤ 2 | Urgent reorder |
| `low` | daysUntilStockout ≤ 5 | Plan reorder |
| `healthy` | daysUntilStockout > 5 | Normal operation |

### Auto-disable Trigger

Products auto-disabled when `countInStock <= 3` (if `autoDisable: true`)

---

## 7. Driver Earnings Calculator

**Base URL:** `/api/v1/driver-earnings`

### Earnings Breakdown

Vehicle rate structures:
```
bicycle:  base=₹10, perKm=₹3, perMinute=₹0.5
scooter:  base=₹15, perKm=₹5, perMinute=₹1.0
bike:     base=₹20, perKm=₹6, perMinute=₹1.5
```

Additional bonuses:
```
tipShare = min(orderValue × 0.05, 30)
surgeBonus = 20% of subtotal if surge active
peakBonus = ₹20 if peak hour
promoBonus = flat or percent per promotion
platformCut = 10% of subtotal
```

### Incentive Milestones

| Deliveries | Bonus |
|-----------|-------|
| 30 | ₹500 |
| 50 | ₹1000 |
| 100 | ₹2500 |
| 200 | ₹6000 |

Weekly target: 25 deliveries = ₹750 bonus

### Effective Rate

```
effectiveRatePerKm = netEarnings / distanceKm
```

---

## Frontend Component Architecture

```
RestaurantOwnerDashboard
├── CostCalculator      → Food cost + ingredient management
├── PricingCalculator  → Commission + pricing tiers
├── DeliveryCalculator  → Fee calculation + route estimation
├── RewardCalculator   → Coin earnings + tier display
├── AnalyticsForecast  → Revenue charts + demand analytics
└── InventoryForecast  → Stock predictions + reorder alerts

DeliveryPartnerDashboard
└── DriverEarningsCalculator → Earnings + incentives + milestones
```

---

## API Response Caching

| Route | Cache Duration |
|-------|---------------|
| `GET /cost-calculator/menu` | 5 minutes |
| `GET /pricing-calculator/market-pricing` | 10 minutes |
| `GET /analytics-forecast/revenue-projection` | 1 minute |
| `GET /inventory-forecast/forecast` | 30 seconds |

---

## Error Handling

| Scenario | Response |
|----------|---------|
| Invalid productId | `404: Product not found` |
| Unauthorized role | `403: Not authorized` |
| Missing required fields | `400: Validation error` |
| Database error | `500: Server error` (non-blocking for push notifications) |

---

## Future Enhancements

- [ ] AI-powered demand forecasting with ML models
- [ ] Real-time competitor price scraping
- [ ] Automatic pricing suggestion based on market position
- [ ] Driver heatmap for optimal zone coverage
- [ ] Inventory supplier integration (auto-reorder to vendors)
- [ ] Carbon footprint calculator per delivery
- [ ] Restaurant profit margin benchmarking
- [ ] Predictive customer lifetime value calculator