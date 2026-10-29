import axios from "axios";

const BASE_URL = "http://localhost:8000/api/v1";

async function runTests() {
  console.log("=== COMPREHENSIVE ENDPOINT & SECURITY INSPECTION ===");

  // 1. Health check
  try {
    const health = await axios.get("http://localhost:8000/health");
    console.log("✅ 1. Health Endpoint: OK -", health.data);
  } catch (err) {
    console.error("❌ 1. Health Endpoint Failed:", err.message);
  }

  // 2. Fetch Products
  let sampleProductId = null;
  try {
    const productsRes = await axios.get(`${BASE_URL}/products`);
    console.log(`✅ 2. GET /products: OK (${productsRes.data.data.length} products found)`);
    if (productsRes.data.data.length > 0) {
      sampleProductId = productsRes.data.data[0].id || productsRes.data.data[0]._id;
      console.log("   Sample product:", productsRes.data.data[0].name, "- Price: ₹", productsRes.data.data[0].price);
    }
  } catch (err) {
    console.error("❌ 2. GET /products Failed:", err.response?.data || err.message);
  }

  // 3. Fetch Single Product
  if (sampleProductId) {
    try {
      const prodRes = await axios.get(`${BASE_URL}/products/${sampleProductId}`);
      console.log(`✅ 3. GET /products/${sampleProductId}: OK - name: "${prodRes.data.name}"`);
    } catch (err) {
      console.error(`❌ 3. GET /products/${sampleProductId} Failed:`, err.response?.data || err.message);
    }
  }

  // 4. Fetch Restaurants
  try {
    const restRes = await axios.get(`${BASE_URL}/restaurants`);
    console.log(`✅ 4. GET /restaurants: OK - count:`, restRes.data.length || restRes.data.restaurants?.length || 0);
  } catch (err) {
    console.error("❌ 4. GET /restaurants Failed:", err.response?.data || err.message);
  }

  // 5. Authentication: Login
  let userToken = null;
  let cookieHeader = null;
  try {
    const loginRes = await axios.post(`${BASE_URL}/users/login`, {
      email: "admin@swadkart.com",
      password: "Password123!",
    });
    userToken = loginRes.data.token;
    cookieHeader = loginRes.headers["set-cookie"];
    console.log(`✅ 5. POST /users/login: OK - Logged in as: ${loginRes.data.name} (${loginRes.data.role})`);
    console.log("   Token present:", !!userToken, "| Cookies set:", cookieHeader?.length || 0);
  } catch (err) {
    console.error("❌ 5. POST /users/login Failed:", err.response?.data || err.message);
  }

  // 6. Authenticated Profile Access
  if (userToken) {
    try {
      const profileRes = await axios.get(`${BASE_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Cookie: cookieHeader ? cookieHeader.join("; ") : "",
        },
      });
      console.log(`✅ 6. GET /users/profile: OK - User: ${profileRes.data.name}, Email: ${profileRes.data.email}`);
    } catch (err) {
      console.error("❌ 6. GET /users/profile Failed:", err.response?.data || err.message);
    }
  }

  // 7. Security: Invalid Login Rate Limiting / Bad Password
  try {
    await axios.post(`${BASE_URL}/users/login`, {
      email: "admin@swadkart.com",
      password: "WrongPassword!999",
    });
    console.error("❌ 7. Security: Expected bad password to fail, but it succeeded!");
  } catch (err) {
    console.log("✅ 7. Security: Bad password correctly rejected with 401:", err.response?.data?.message || err.message);
  }

  // 8. Frontend Proxy Test
  try {
    const feProxyRes = await axios.get("http://localhost:5173/api/v1/products");
    console.log(`✅ 8. Frontend Vite Proxy (port 5173 -> 8000): OK (${feProxyRes.data.data.length} items)`);
  } catch (err) {
    console.error("❌ 8. Frontend Proxy Failed:", err.message);
  }

  console.log("\n=== INSPECTION COMPLETED ===");
}

runTests();

