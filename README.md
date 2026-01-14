# SwadKart-pro 🍽️

A full-stack food delivery web application that revolutionizes online food ordering in Jaipur. SwadKart-pro provides users with seamless access to top-rated restaurants, dynamic menus, and a modern, responsive ordering experience powered by the MERN stack.

🔗 **Live URL:** [https://swadkart-pro.vercel.app/](https://swadkart-pro.vercel.app/)  
👨‍💻 **Developer:** Gautam Kumar ([@theunstopabble](https://github.com/theunstopabble))  
📍 **Built at:** Jagannath University, Jaipur, Rajasthan, India

---

## 🌟 Key Features

### User-Facing Features
- **🏪 Restaurant Discovery:** Browse and discover top-rated restaurants in Jaipur with ratings, delivery times, and cuisine categories
- **📋 Dynamic Menu System:** View detailed menus with item descriptions, pricing, and images for each restaurant
- **🔍 Smart Search Functionality:** Central search page to quickly find dishes or restaurants from anywhere in the app
- **🛒 Shopping Cart:** Manage items before checkout with quantity controls and order summary
- **👤 User Authentication:** Secure login and signup flows for personalized ordering experience
- **📧 Newsletter Subscription:** "Swad News" section to subscribe for exclusive offers and promotional updates
- **📱 Responsive Design:** Fully optimized UI for desktop and mobile devices for smooth food ordering on any screen

### Content & Information
- **About Page:** Learn more about SwadKart-pro's mission and team
- **Blog Section:** Food-related articles and stories (ready for dynamic content)
- **FAQ & Help Center:** Comprehensive support documentation
- **Terms & Privacy Policy:** Complete legal documentation
- **Contact Page:** Direct communication channel for customer inquiries
- **Social Links:** Connected to creator's social profiles (Facebook, X/Twitter, Instagram, LinkedIn)

### Technical Features
- **100+ Deployments:** Actively maintained and continuously deployed via Vercel
- **Production-Ready Architecture:** Separation of concerns with dedicated frontend and backend
- **Modern Tech Stack:** Built with React, Node.js, and MongoDB for scalability

---

## 🏗️ Architecture

SwadKart-pro follows a **MERN (MongoDB, Express, React, Node.js)** architecture with clear separation between frontend and backend.

```
SwadKart-pro/
├── frontend/              # React SPA for user interface
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/               # Node.js/Express API server
│   ├── controllers/       # Business logic
│   ├── models/            # Database schemas
│   ├── routes/            # API endpoints
│   ├── middleware/        # Authentication & validation
│   └── package.json
├── .vscode/               # Editor configuration
└── .gitignore
```

### Frontend (`/frontend`)
- **Framework:** React.js (Single Page Application)
- **Deployment:** Vercel (auto-deployment from main branch)
- **Key Components:**
  - Hero section with restaurant search CTA
  - Restaurant grid with cards (ratings, delivery time, cuisine type)
  - Restaurant detail pages with menu display
  - Cart management system
  - User authentication forms
  - Footer with links and social presence
  - Responsive navigation bar

### Backend (`/backend`)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Key Responsibilities:**
  - REST APIs for restaurants, menus, and orders
  - User authentication and authorization
  - Cart and order management
  - Integration with third-party services (payment, OTP, emails)
  - Business logic and data validation

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v14+ recommended, use LTS for stability)
- **npm** or **yarn** package manager
- **Git** for version control
- **MongoDB** (local or cloud instance like MongoDB Atlas)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/theunstopabble/SwadKart-pro.git
cd SwadKart-pro
```

#### 2. Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Third-party Services (optional)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# OTP/SMS (if using)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Payment Gateway (Razorpay/Stripe)
RAZORPAY_KEY=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret
```

#### 3. Setup Frontend
```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

#### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Backend runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Frontend runs on http://localhost:3000
```

The app will open automatically at `http://localhost:3000`

---

## 🔧 Available Scripts

### Backend
```bash
npm start              # Run server in production mode
npm run dev            # Run with nodemon (hot reload)
npm test              # Run test suite
```

### Frontend
```bash
npm start              # Start development server
npm run build         # Create production build
npm test              # Run tests
npm run eject         # Eject from create-react-app (⚠️ irreversible)
```

---

## 🌐 Deployment

SwadKart-pro is deployed and continuously updated on **Vercel**.

### Current Deployment
- **URL:** https://swadkart-pro.vercel.app/
- **Platform:** Vercel (Frontend)
- **Deployment History:** 120+ deployments
- **Branch:** Main branch auto-deploys on push

### Deploy Your Own Fork

#### Step 1: Fork the Repository
Click the "Fork" button on GitHub to create your own copy.

#### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import your forked repository
5. Select "Next.js" or "React" as the framework

#### Step 3: Configure Environment Variables
In Vercel dashboard → Project Settings → Environment Variables

Add:
```
REACT_APP_API_URL=your_backend_url
REACT_APP_ENV=production
```

#### Step 4: Deploy
```bash
git push origin main
```
Vercel will automatically detect changes and deploy. Track deployments in the Vercel dashboard.

---

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  password: String (hashed),
  addresses: [Address],
  createdAt: Date,
  updatedAt: Date
}
```

### Restaurants Collection
```javascript
{
  _id: ObjectId,
  name: String,
  cuisine: [String],
  rating: Number,
  deliveryTime: Number,
  image: String,
  location: {
    city: String,
    address: String,
    coordinates: { lat, lng }
  },
  menu: [ObjectId], // References to Menu items
  createdAt: Date
}
```

### Menu Collection
```javascript
{
  _id: ObjectId,
  restaurantId: ObjectId,
  name: String,
  description: String,
  price: Number,
  image: String,
  category: String,
  isAvailable: Boolean,
  createdAt: Date
}
```

### Orders Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  items: [{ menuId, quantity, price }],
  restaurantId: ObjectId,
  totalAmount: Number,
  status: String, // "pending", "confirmed", "preparing", "out_for_delivery", "delivered"
  deliveryAddress: String,
  paymentMethod: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Authentication & Security

- **JWT (JSON Web Tokens):** Secure token-based authentication
- **Password Hashing:** bcryptjs for secure password storage
- **Environment Variables:** Sensitive data stored in `.env` files (never committed)
- **CORS Configuration:** Restricted API access to authorized domains
- **Input Validation:** All user inputs validated on both frontend and backend

---

## 📈 Future Roadmap

### Phase 2 - Enhanced Functionality
- [ ] **Real Payment Integration:** Razorpay/Stripe integration for actual payments
- [ ] **Advanced Filters:** Search by cuisine type, veg/non-veg, price range, ratings
- [ ] **Order History:** Users can view past orders and reorder
- [ ] **Real-time Order Tracking:** Live order status updates with map integration
- [ ] **Reviews & Ratings:** Customer reviews and ratings for restaurants and items

### Phase 3 - Admin & Business Features
- [ ] **Restaurant Admin Panel:** Dashboard for restaurant owners to manage menu and orders
- [ ] **Order Analytics:** Sales reports, popular items, customer insights
- [ ] **Delivery Tracking:** Admin panel for delivery personnel location tracking
- [ ] **Multi-language Support:** Hindi and English language options

### Phase 4 - Advanced Features
- [ ] **Push Notifications:** Order status notifications to users
- [ ] **Loyalty Program:** Points/rewards system for frequent customers
- [ ] **AI Recommendations:** Personalized menu suggestions based on order history
- [ ] **Subscription Model:** Premium delivery pass for unlimited free delivery
- [ ] **Progressive Web App:** Installable PWA for offline functionality

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Guidelines
- Follow the existing code structure and naming conventions
- Write clear commit messages
- Test your changes before submitting PR
- Add comments for complex logic
- Update documentation if needed

---

## 📝 License

This project is currently released without an explicit open-source license.

**Usage Terms:**
- For personal learning and portfolio purposes: ✅ Allowed
- For commercial use or resale: ❌ Please contact the author first
- For modifications and redistribution: ❌ Please contact the author first

If you wish to use this project commercially or modify it extensively, please reach out to the author for permission.

---

## 📞 Contact & Support

### Author Information
**Name:** Gautam Kumar  
**Email:** [swadkartt@gmail.com](mailto:swadkartt@gmail.com)  
**Location:** Jaisinghpura, Rajasthan, India  
**University:** Jagannath University, Jaipur

### Social Profiles
- 🌐 **Website/Live App:** [swadkart-pro.vercel.app](https://swadkart-pro.vercel.app/)
- 💼 **LinkedIn:** [@gautamkr62](https://www.linkedin.com/in/gautamkr62/)
- 🐦 **Twitter/X:** [@_unstopabble](https://x.com/_unstopabble)
- 📘 **Facebook:** [gautam.theunstopabble](https://www.facebook.com/gautam.theunstopabble)
- 📸 **Instagram:** [@theunstopabble](https://www.instagram.com/theunstopabble/)
- 🐙 **GitHub:** [@theunstopabble](https://github.com/theunstopabble)

### Getting Help
- 📧 Email: swadkartt@gmail.com
- 🔗 GitHub Issues: [Report bugs or request features](https://github.com/theunstopabble/SwadKart-pro/issues)
- 💬 LinkedIn: Connect for collaboration opportunities

---

## ⭐ Show Your Support

If you found this project helpful or interesting, please consider:
- ⭐ Giving it a star on GitHub
- 🔗 Sharing it with others
- 💬 Providing feedback and suggestions
- 🤝 Contributing to the project

**Thank you for checking out SwadKart-pro!** Happy coding! 🚀

---

*Last Updated: January 2026*  
*Built with ❤️ by Gautam Kumar*
