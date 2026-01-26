# 🍔 SwadKart Pro - Next-Gen Food Delivery Platform
![SwadKart Banner](https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop)

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=vercel)](https://swadkart.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![MERN Stack](https://img.shields.io/badge/Stack-MERN-blueviolet?style=for-the-badge)](https://mongodb.com)

**SwadKart** is a full-stack, progressive web application (PWA) designed to bridge the gap between web and native mobile experiences. It features a robust food ordering system secured by **Biometric Authentication (WebAuthn)**, giving users continuous security without the hassle of passwords.

---

## 🔒 key Feature: Biometric Security Suite (v2.0)
SwadKart integrates **FIDO2 WebAuthn** standards to provide banking-grade security directly in the browser.

### ✨ Features
- **👆 One-Tap Login:** Authenticate using your device's native Fingerprint or FaceID sensor.
- **🛡️ Premium App Lock:** Secure your wallet and order history with a custom "Glassmorphism" lock screen.
- **📱 Smart Hardware Detection:** The UI automatically adapts if the device lacks biometric hardware.
- **🧠 Dynamic Environment Config:** Securely handles authentication across Localhost (HTTP) and Production (HTTPS) without code changes.

### 🎥 How It Works
1.  **Register:** Users enable "App Lock" in their Profile.
2.  **Verify:** The browser prompts to scan fingerprint (stored securely in device Enclave).
3.  **Secure:** A public key is sent to the SwadKart server; the private key never leaves the device.
4.  **Unlock:** Next time, just tap to unlock!

---

## 🚀 Tech Stack

### Frontend
- **React.js (Vite):** Blazing fast UI rendering.
- **Tailwind CSS:** Modern, responsive, and mobile-first styling.
- **Redux Toolkit:** Global state management for Cart & User logic.
- **PWA:** Service Workers for offline capabilities and "Install App" feature.

### Backend
- **Node.js & Express:** Scalable REST API architecture.
- **MongoDB:** Flexible schema design for Users, Orders, and Restaurants.
- **SimpleWebAuthn:** Server-side verification for Passkeys/Biometrics.
- **JWT:** Secure session management.

---

## 🛠️ Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/theunstopabble/SwadKart-pro.git
   cd SwadKart-pro
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Environment Setup (.env)**
   Create `.env` in `backend/` and `frontend/`.

   **Backend (.env):**
   ```env
   PORT=8000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   
   # Biometric Config (CRITICAL)
   FRONTEND_URL=http://localhost:5173  # Or your Vercel URL
   RP_ID=localhost                     # Or your Vercel Domain (e.g., swadkart.vercel.app)
   RP_NAME=SwadKart
   ```

   **Frontend (.env):**
   ```env
   VITE_API_URL=http://localhost:8000  # Or your Render Backend URL
   ```

4. **Run Locally**
   ```bash
   # Terminal 1 (Backend)
   cd backend && npm start

   # Terminal 2 (Frontend)
   cd frontend && npm run dev
   ```

---

## 📸 Screen Showcase

| Premium Lock Screen | Profile Control Center |
|:---:|:---:|
| <img src="frontend/assets/screenshot-mobile.png" alt="Lock Screen" width="200"/> | <img src="frontend/assets/screenshot-home.png" alt="Profile" width="200"/> |

---

## 🤝 Contributing
Contributions are welcome! Pull requests will be reviewed.

## 📄 License
This project is licensed under the MIT License.
