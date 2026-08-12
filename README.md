# 🛒 Smart Grocery Shop Management System
### ස්මාර්ට් සිල්ලර බඩු කළමනාකරණ සහ ඇණවුම් පද්ධතිය

A complete **Smart Grocery Shop Management System** built with **HTML5, CSS3 Glassmorphism, Modern Vanilla JavaScript (ES6+), Node.js, REST API, and Persistent Database Storage**.

---

## 🌟 Key Features

### 👤 Customer Side
- **Product Catalog**: Browse fresh grocery items with live search & category filters.
- **Cart & Checkout**: Interactive side drawer cart with subtotal calculation.
- **Cash on Pickup Payment**: Customer places order choosing **Cash on Pickup**.
- **Real-Time Notification System**: Audio chime & toast alert when shop staff updates order status to **Ready for Pickup**.
- **Order Tracker & PIN Code**: Live 4-step status timeline (`Pending` ➔ `Preparing` ➔ `Ready for Pickup` ➔ `Completed`) with a unique 4-digit Pickup PIN code.

### 👨‍🍳 Shop Staff Side
- **Order Processing Board (Kanban Queue)**: Manage incoming orders sorted by status columns.
- **Automated Customer Notification Trigger**: Advancing status to **Ready for Pickup** automatically alerts the customer with pickup instructions & cash amount.
- **Inventory & Stock Management**: View product stock levels, low-stock warnings (< 5 units), quick +10 stock updater, add/edit/delete product form.

### 📊 Admin Side
- **Analytics Dashboard**: Live KPI cards for Total Revenue, Total Orders, Low Stock Alerts, and Active Users.
- **Interactive HTML5 Canvas Sales Chart**: Visualizes daily revenue trends.
- **Management Controls**: Customer directory, Staff management, Category control, and CSV Sales Report Exporter.

---

## 🌐 Live Deployment Guide (නොමිලේ Online දමන ආකාරය)

### Option A: Render.com (Recommended Free Node.js Hosting)

1. **Git Repository එකක් සෑදීම**:
   ```bash
   cd /Users/dinan/.gemini/antigravity/scratch/smart-grocery-system
   git init
   git add .
   git commit -m "Deploy Smart Grocery System"
   ```
2. ඔබගේ [GitHub](https://github.com) එකෙහි New Repository එකක් සාදා ඉහත Code එක Push කරන්න.
3. [Render.com](https://render.com) හි නොමිලේ Account එකක් සාදා **New Web Service** තෝරන්න.
4. ඔබගේ GitHub Repository එක Select කර පහත පරිදි සකසන්න:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/server.js`
5. **Create Web Service** ක්ලික් කරන්න. තත්පර 60කින් ඔබට `https://smart-grocery.onrender.com` වැනි **Live Web URL** එකක් ලැබෙනු ඇත!

---

### Option B: Vercel Instant Deployment (Terminal එකෙන් එක පාරින් Live කිරීම)

1. Terminal එකේ ව්‍යාපෘති folder එකට යන්න:
   ```bash
   cd /Users/dinan/.gemini/antigravity/scratch/smart-grocery-system
   ```
2. Vercel command එක ධාවනය කරන්න:
   ```bash
   npx vercel
   ```
3. තිරයේ දිස්වන ප්‍රශ්න 3ට `Enter` ඔබන්න. ඔබට `https://smart-grocery-system.vercel.app` වැනි Live URL එකක් ක්ෂණිකව ලැබෙනු ඇත!
