<div align="center">

  <img src="frontend/public/logo.png" alt="SwadKart Logo" width="120" />

  # SwadKart
  
  **Next-Gen Multi-Vendor Food Delivery Platform | Built at Jagannath University, Jaipur**

  <div>
    <a href="https://swadkart-pro.vercel.app/">
      <img src="https://img.shields.io/badge/Live_Demo-Visit_Now-success?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
    </a>
    <a href="https://github.com/theunstopabble/SwadKart-pro">
      <img src="https://img.shields.io/github/stars/theunstopabble/SwadKart-pro?style=for-the-badge&logo=github&color=blue" alt="GitHub Stars" />
    </a>
    <img src="https://img.shields.io/github/last-commit/theunstopabble/SwadKart-pro?style=for-the-badge&color=orange" alt="Last Commit" />
  </div>

  <p align="center">
    <br />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/Redux_Toolkit-593D88?style=for-the-badge&logo=redux&logoColor=white" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  </p>
</div>

---

## 📖 About The Project

**SwadKart-pro** is a scalable, full-stack food delivery application designed to connect hungry users with the best local restaurants in Jaipur. It features a sophisticated **multi-role ecosystem** (Admin, Restaurant Owner, Delivery Partner, and User) powered by the MERN stack.

Unlike simple clones, SwadKart includes production-grade features like **Real-time Order Tracking (Socket.io)**, **Interactive Heatmaps for Demand Analysis**, **Live Revenue Analytics**, and a **Secure Role-Based Authentication System**.

### 📸 Application Previews

| **Home Page & Discovery** | **Admin Dashboard & Analytics** |
|:-------------------------:|:---------------------:|
| ![Home Page](frontend/assets/screenshot-home.png) | ![Admin Panel](frontend/assets/screenshot-admin.png) |

| **Dynamic Menu Lab** | **Mobile Responsive** |
|:-------------------:|:---------------------:|
| ![Menu Page](frontend/assets/screenshot-menu.png) | ![Mobile View](frontend/assets/screenshot-mobile.png) |

---

## 🌟 Key Features

### 🛍️ User Experience
* **Smart Discovery:** Filter restaurants by delivery time, rating, and cuisine type.
* **Dynamic Cart:** Real-time price calculation with Redux state management.
* **Secure Auth:** Hybrid authentication using **JWT** (Email/Password) and **Firebase** (Google Auth).
* **Order Tracking:** Real-time updates from "Preparing" to "Out for Delivery".

### 👑 Admin Command Center
* **Live Analytics:** Visual charts for Revenue, Orders, and Active Users.
* **Demand Heatmap:** Interactive map using `Leaflet.js` to visualize high-demand zones.
* **User Management:** Role-based access control to manage Users, Merchants, and Riders.
* **Coupon Engine:** Create and manage discount codes dynamically.

### 🏪 Restaurant & Delivery
* **Menu Lab:** Restaurant owners can manage stock, add variants, and toggle availability.
* **Delivery Dashboard:** dedicated interface for riders to accept/reject orders and verify delivery via **Secure OTP**.

---

## 🏗️ Architecture & Tech Stack

The project follows a clean **MVC (Model-View-Controller)** architecture with a clear separation of concerns.

### **Frontend (`/frontend`)**
* **Framework:** React.js (Vite)
* **State Management:** Redux Toolkit
* **Styling:** Tailwind CSS + Lucide React Icons
* **Routing:** React Router DOM
* **Real-time:** Socket.io-client

### **Backend (`/backend`)**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB Atlas (Mongoose ODM)
* **Authentication:** JWT + Firebase Admin SDK
* **Real-time:** Socket.io
* **Email:** Nodemailer (SMTP)

---

## 🚀 Getting Started

Follow these steps to set up SwadKart locally.

### Prerequisites
* Node.js (v18+)
* MongoDB Connection String (Atlas)
* Google Firebase Project (for Auth)

### 1. Clone the Repository
```bash
git clone [https://github.com/theunstopabble/SwadKart-pro.git](https://github.com/theunstopabble/SwadKart-pro.git)
cd SwadKart-pro
2. Backend Setup
Navigate to the backend folder and install dependencies:
cd backend
npm install
Create a .env file in /backend and add the following:
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=30d
NODE_ENV=development

# Email Service (For OTPs)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_MAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Frontend URL (For CORS)
FRONTEND_URL=http://localhost:5173
