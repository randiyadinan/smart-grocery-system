const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

class Database {
  constructor() {
    this.data = {
      categories: [],
      products: [],
      users: [],
      orders: [],
      notifications: []
    };
    this.load();
    this.ensureDefaultUsers();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error reading db.json, fallback to memory:', err);
    }
  }

  save() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  ensureDefaultUsers() {
    // Make sure default accounts have passwords for authentication
    const defaultUsers = [
      {
        id: 'usr_cust1',
        name: 'Kasun Perera',
        email: 'kasun@gmail.com',
        phone: '+94 77 123 4567',
        password: 'customer123',
        role: 'customer'
      },
      {
        id: 'usr_staff1',
        name: 'Sunil Perera (Staff)',
        email: 'staff@grocery.com',
        phone: '+94 71 987 6543',
        password: 'staff123',
        role: 'staff'
      },
      {
        id: 'usr_admin1',
        name: 'Nimal Fernando (Admin Manager)',
        email: 'admin@grocery.com',
        phone: '+94 70 000 1122',
        password: 'admin123',
        role: 'admin'
      }
    ];

    let updated = false;
    defaultUsers.forEach(defUser => {
      const existing = this.data.users.find(u => u.email === defUser.email);
      if (!existing) {
        this.data.users.push(defUser);
        updated = true;
      } else if (!existing.password) {
        existing.password = defUser.password;
        updated = true;
      }
    });

    if (updated) this.save();
  }

  // --- Auth & User Management ---
  authenticate(email, password, expectedRole) {
    const user = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found with this email' };
    }
    if (user.password !== password) {
      return { success: false, message: 'Incorrect password' };
    }
    if (expectedRole && user.role !== expectedRole) {
      return { success: false, message: `Access denied. This account is not registered as ${expectedRole.toUpperCase()}` };
    }

    const token = 'token_' + user.id + '_' + Date.now();
    const safeUser = { ...user };
    delete safeUser.password;

    return {
      success: true,
      token,
      user: safeUser
    };
  }

  registerUser(userData) {
    const existing = this.data.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      return { success: false, message: 'An account with this email already exists' };
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      password: userData.password,
      role: userData.role || 'customer'
    };

    this.data.users.push(newUser);
    this.save();

    const safeUser = { ...newUser };
    delete safeUser.password;

    const token = 'token_' + newUser.id + '_' + Date.now();

    return {
      success: true,
      token,
      user: safeUser
    };
  }

  getUsers() {
    return this.data.users.map(u => {
      const safe = { ...u };
      delete safe.password;
      return safe;
    });
  }

  deleteUser(id) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index !== -1) {
      const deleted = this.data.users.splice(index, 1);
      this.save();
      return deleted[0];
    }
    return null;
  }

  // --- Products ---
  getProducts() {
    return this.data.products;
  }

  getProductById(id) {
    return this.data.products.find(p => p.id === id);
  }

  addProduct(productData) {
    const newProduct = {
      id: 'prod_' + Date.now(),
      name: productData.name,
      category: productData.category,
      categoryName: productData.categoryName || 'General',
      price: Number(productData.price),
      unit: productData.unit || '1 unit',
      stock: Number(productData.stock),
      lowStockLimit: Number(productData.lowStockLimit || 5),
      image: productData.image || '🛒',
      description: productData.description || ''
    };
    this.data.products.unshift(newProduct);
    this.save();
    return newProduct;
  }

  updateProduct(id, updates) {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.products[index] = { ...this.data.products[index], ...updates };
      this.save();
      return this.data.products[index];
    }
    return null;
  }

  deleteProduct(id) {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index !== -1) {
      const deleted = this.data.products.splice(index, 1);
      this.save();
      return deleted[0];
    }
    return null;
  }

  // --- Categories ---
  getCategories() {
    return this.data.categories;
  }

  addCategory(categoryData) {
    const newCat = {
      id: 'cat_' + Date.now(),
      name: categoryData.name,
      icon: categoryData.icon || '📦',
      slug: categoryData.name.toLowerCase().replace(/\s+/g, '-')
    };
    this.data.categories.push(newCat);
    this.save();
    return newCat;
  }

  deleteCategory(id) {
    const index = this.data.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      const deleted = this.data.categories.splice(index, 1);
      this.save();
      return deleted[0];
    }
    return null;
  }

  // --- Orders & Notifications ---
  getOrders() {
    return this.data.orders;
  }

  getOrderById(id) {
    return this.data.orders.find(o => o.id === id);
  }

  createOrder(orderData) {
    const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();
    const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);

    // Deduct stock for each item
    orderData.items.forEach(item => {
      const prod = this.getProductById(item.id);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    });

    const newOrder = {
      id: orderId,
      customerId: orderData.customerId || 'usr_cust1',
      customerName: orderData.customerName || 'Valued Customer',
      customerPhone: orderData.customerPhone || '',
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      paymentMethod: 'Cash on Pickup',
      status: 'Pending',
      pickupPin: pickupPin,
      notes: orderData.notes || '',
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.orders.unshift(newOrder);

    // Initial notification
    this.addNotification({
      customerId: newOrder.customerId,
      orderId: newOrder.id,
      message: `🛒 Order #${newOrder.id} placed successfully! Status: Pending. Total: Rs. ${newOrder.totalAmount.toLocaleString()} (Cash on Pickup).`,
      type: 'order_placed'
    });

    this.save();
    return newOrder;
  }

  updateOrderStatus(orderId, status) {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date().toISOString();

    let notifMessage = '';
    let notifType = 'status_update';

    if (status === 'Preparing') {
      notifMessage = `👨‍🍳 Shop staff started PREPARING your order #${order.id}!`;
      notifType = 'preparing';
    } else if (status === 'Ready for Pickup') {
      notifMessage = `🎉 Your Order #${order.id} is READY FOR PICKUP! Please bring Rs. ${order.totalAmount.toLocaleString()} cash to the shop. Pickup PIN: ${order.pickupPin}`;
      notifType = 'ready_for_pickup';
    } else if (status === 'Completed') {
      notifMessage = `✅ Order #${order.id} completed! Thank you for shopping with us.`;
      notifType = 'completed';
    } else if (status === 'Cancelled') {
      notifMessage = `❌ Order #${order.id} was cancelled by shop.`;
      notifType = 'cancelled';

      // Restore stock
      order.items.forEach(item => {
        const prod = this.getProductById(item.id);
        if (prod) {
          prod.stock += item.quantity;
        }
      });
    }

    if (notifMessage) {
      this.addNotification({
        customerId: order.customerId,
        orderId: order.id,
        message: notifMessage,
        type: notifType
      });
    }

    this.save();
    return order;
  }

  // --- Notifications ---
  getNotifications(customerId) {
    if (customerId) {
      return this.data.notifications.filter(n => n.customerId === customerId);
    }
    return this.data.notifications;
  }

  addNotification(notif) {
    const newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      customerId: notif.customerId,
      orderId: notif.orderId,
      message: notif.message,
      type: notif.type,
      read: false,
      timestamp: new Date().toISOString()
    };
    this.data.notifications.unshift(newNotif);
    this.save();
    return newNotif;
  }

  markNotificationsRead(customerId) {
    this.data.notifications.forEach(n => {
      if (!customerId || n.customerId === customerId) {
        n.read = true;
      }
    });
    this.save();
  }

  // --- Analytics Stats ---
  getAdminStats() {
    const completedOrders = this.data.orders.filter(o => o.status === 'Completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const lowStockCount = this.data.products.filter(p => p.stock <= p.lowStockLimit).length;
    const activeCustomers = this.data.users.filter(u => u.role === 'customer').length;
    const pendingOrdersCount = this.data.orders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length;

    return {
      totalRevenue,
      totalOrders: this.data.orders.length,
      completedOrders: completedOrders.length,
      pendingOrdersCount,
      activeCustomers,
      lowStockCount,
      totalProducts: this.data.products.length
    };
  }
}

module.exports = new Database();
