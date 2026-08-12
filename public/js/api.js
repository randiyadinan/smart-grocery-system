/**
 * Frontend REST API Client
 * Includes Authentication & Multi-Role Authorization
 */
const API = {
  baseUrl: '/api',

  // Authentication Helpers
  getAuthToken() {
    return localStorage.getItem('grocery_token');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('grocery_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setCurrentUser(token, user) {
    localStorage.setItem('grocery_token', token);
    localStorage.setItem('grocery_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('grocery_token');
    localStorage.removeItem('grocery_user');
  },

  async request(endpoint, options = {}) {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(this.baseUrl + endpoint, { ...options, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Server error');
      return data;
    } catch (err) {
      console.warn(`API [${endpoint}] failed:`, err.message);
      return { success: false, message: err.message };
    }
  },

  // Auth API
  async login(email, password, role) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
    if (res && res.success) {
      this.setCurrentUser(res.token, res.user);
    }
    return res;
  },

  async register(name, email, phone, password, role = 'customer') {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, role })
    });
    if (res && res.success) {
      this.setCurrentUser(res.token, res.user);
    }
    return res;
  },

  // Products API
  async getProducts(category, search) {
    let query = '';
    if (category) query += `?category=${encodeURIComponent(category)}`;
    if (search) query += `${query ? '&' : '?'}search=${encodeURIComponent(search)}`;
    return await this.request('/products' + query);
  },

  async addProduct(productData) {
    return await this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async updateProduct(id, updates) {
    return await this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteProduct(id) {
    return await this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  },

  // Categories API
  async getCategories() {
    return await this.request('/categories');
  },

  // Orders API
  async getOrders(customerId) {
    const query = customerId ? `?customerId=${customerId}` : '';
    return await this.request('/orders' + query);
  },

  async createOrder(orderData) {
    return await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  async updateOrderStatus(orderId, status) {
    return await this.request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // Notifications API
  async getNotifications(customerId) {
    const query = customerId ? `?customerId=${customerId}` : '';
    return await this.request('/notifications' + query);
  },

  async markNotificationsRead(customerId) {
    return await this.request('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ customerId })
    });
  },

  // Admin Analytics API
  async getAdminStats() {
    return await this.request('/admin/stats');
  },

  async getUsers() {
    return await this.request('/users');
  }
};
