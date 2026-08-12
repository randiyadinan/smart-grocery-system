/**
 * Customer Portal Logic & Shopping Cart Controller
 */
const CustomerPortal = {
  cart: [],
  activeCategory: 'all',
  searchQuery: '',

  async init() {
    const user = API.getCurrentUser();
    if (!user) return;

    // Auto fill customer details in checkout form
    const custNameInput = document.getElementById('custNameInput');
    const custPhoneInput = document.getElementById('custPhoneInput');
    if (custNameInput) custNameInput.value = user.name || '';
    if (custPhoneInput) custPhoneInput.value = user.phone || '';

    this.bindEvents();
    await this.loadCategories();
    await this.loadProducts();
    await this.loadNotifications();
    await this.loadMyOrdersCount();
    
    // Poll for notifications and order status changes every 3 seconds
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      const activeUser = API.getCurrentUser();
      if (activeUser && activeUser.role === 'customer') {
        this.loadNotifications(true);
        this.loadMyOrdersCount();
      }
    }, 3000);
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value.trim();
        this.loadProducts();
      };
    }

    // Category chips delegation
    const categoryBar = document.getElementById('categoryBar');
    if (categoryBar) {
      categoryBar.onclick = (e) => {
        const chip = e.target.closest('.cat-chip');
        if (chip) {
          document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.activeCategory = chip.dataset.category;
          this.loadProducts();
        }
      };
    }

    // Cart Drawer Toggle
    const cartTriggerBtn = document.getElementById('cartTriggerBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
    
    if (cartTriggerBtn) cartTriggerBtn.onclick = () => this.openCart();
    if (closeCartBtn) closeCartBtn.onclick = () => this.closeCart();
    if (cartDrawerOverlay) {
      cartDrawerOverlay.onclick = (e) => {
        if (e.target === cartDrawerOverlay) this.closeCart();
      };
    }

    // Checkout Modal
    const checkoutBtn = document.getElementById('checkoutBtn');
    const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
    const cancelCheckoutBtn = document.getElementById('cancelCheckoutBtn');
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutForm = document.getElementById('checkoutForm');

    if (checkoutBtn) checkoutBtn.onclick = () => this.openCheckout();
    if (closeCheckoutBtn) closeCheckoutBtn.onclick = () => this.closeCheckout();
    if (cancelCheckoutBtn) cancelCheckoutBtn.onclick = () => this.closeCheckout();

    if (checkoutForm) {
      checkoutForm.onsubmit = (e) => {
        e.preventDefault();
        this.placeOrder();
      };
    }

    // My Orders Modal
    const openOrdersBtn = document.getElementById('openOrdersBtn');
    const closeOrdersModalBtn = document.getElementById('closeOrdersModalBtn');
    if (openOrdersBtn) openOrdersBtn.onclick = () => this.openOrdersModal();
    if (closeOrdersModalBtn) closeOrdersModalBtn.onclick = () => this.closeOrdersModal();

    // Notifications Popover Toggle
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const markReadBtn = document.getElementById('markReadBtn');

    if (notifBtn) {
      notifBtn.onclick = (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
      };
    }

    document.onclick = (e) => {
      if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBtn) {
        notifDropdown.classList.add('hidden');
      }
    };

    if (markReadBtn) {
      markReadBtn.onclick = async () => {
        const user = API.getCurrentUser();
        if (user) {
          await API.markNotificationsRead(user.id);
          this.loadNotifications();
        }
      };
    }
  },

  async loadCategories() {
    const res = await API.getCategories();
    if (!res || !res.categories) return;

    const categoryBar = document.getElementById('categoryBar');
    if (!categoryBar) return;

    let html = `<button class="cat-chip active" data-category="all">All Items</button>`;
    res.categories.forEach(c => {
      html += `<button class="cat-chip" data-category="${c.id}">${c.icon} ${c.name}</button>`;
    });

    categoryBar.innerHTML = html;
  },

  async loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">Loading fresh groceries...</div>`;

    const res = await API.getProducts(this.activeCategory, this.searchQuery);
    const products = res && res.products ? res.products : [];

    if (!products.length) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md);">
          <span style="font-size: 3rem;">🔍</span>
          <h3 style="margin-top: 1rem;">No grocery items found</h3>
          <p style="color: var(--text-muted);">Try searching for another term or selecting a different category.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(p => {
      const isOutOfStock = p.stock <= 0;
      const isLowStock = p.stock > 0 && p.stock <= (p.lowStockLimit || 5);

      return `
        <div class="product-card">
          <div class="product-image">${p.image || '🛒'}</div>
          <span class="product-cat">${p.categoryName || 'Grocery'}</span>
          <h4 class="product-title">${p.name}</h4>
          <span class="product-unit">Unit: ${p.unit}</span>
          
          <div style="margin: 0.5rem 0;">
            ${isOutOfStock 
              ? `<span class="badge" style="background: rgba(244,63,94,0.2); color:#f43f5e;">Out of Stock</span>`
              : isLowStock 
              ? `<span class="badge" style="background: rgba(245,158,11,0.2); color:#fbbf24;">Only ${p.stock} left</span>`
              : `<span class="badge" style="background: rgba(16,185,129,0.15); color:#34d399;">In Stock (${p.stock})</span>`
            }
          </div>

          <div class="product-footer">
            <span class="product-price">${Utils.formatCurrency(p.price)}</span>
            <button class="btn btn-primary btn-sm" 
              onclick="CustomerPortal.addToCart('${p.id}')"
              ${isOutOfStock ? 'disabled' : ''}>
              ${isOutOfStock ? 'Sold Out' : '➕ Add'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async addToCart(productId) {
    const res = await API.getProducts();
    const products = res ? res.products : [];
    const product = products.find(p => String(p.id) === String(productId));

    if (!product || product.stock <= 0) {
      Utils.showToast('Item is out of stock', 'error');
      return;
    }

    const existingIndex = this.cart.findIndex(item => String(item.id) === String(productId));
    if (existingIndex !== -1) {
      if (this.cart[existingIndex].quantity >= product.stock) {
        Utils.showToast(`Cannot add more than available stock (${product.stock})`, 'warning');
        return;
      }
      this.cart[existingIndex].quantity += 1;
      this.cart[existingIndex].subtotal = this.cart[existingIndex].quantity * product.price;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        quantity: 1,
        subtotal: product.price,
        image: product.image
      });
    }

    this.updateCartUI();
    Utils.showToast(`Added "${product.name}" to cart!`, 'success');
  },

  updateCartQuantity(productId, change) {
    const item = this.cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(i => i.id !== productId);
    } else {
      item.subtotal = item.quantity * item.price;
    }
    this.updateCartUI();
  },

  updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItemsList = document.getElementById('cartItemsList');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    const totalQty = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = this.cart.reduce((sum, item) => sum + item.subtotal, 0);

    if (cartCount) cartCount.textContent = totalQty;
    if (cartSubtotal) cartSubtotal.textContent = Utils.formatCurrency(totalPrice);
    if (checkoutBtn) checkoutBtn.disabled = this.cart.length === 0;

    if (!cartItemsList) return;

    if (this.cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
          <span style="font-size: 3rem; display: block; margin-bottom: 0.5rem;">🛒</span>
          <p>Your shopping cart is empty.</p>
        </div>
      `;
      return;
    }

    cartItemsList.innerHTML = this.cart.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.8rem;">${item.image || '📦'}</span>
          <div>
            <div style="font-weight: 700; font-size: 0.9rem;">${item.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${Utils.formatCurrency(item.price)} / ${item.unit}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <div style="display: flex; align-items: center; background: rgba(15,23,42,0.8); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            <button style="background: none; border: none; color: white; padding: 0.2rem 0.5rem; cursor: pointer;" onclick="CustomerPortal.updateCartQuantity('${item.id}', -1)">-</button>
            <span style="padding: 0 0.4rem; font-weight: 700; font-size: 0.85rem;">${item.quantity}</span>
            <button style="background: none; border: none; color: white; padding: 0.2rem 0.5rem; cursor: pointer;" onclick="CustomerPortal.updateCartQuantity('${item.id}', 1)">+</button>
          </div>
          <span style="font-weight: 700; font-size: 0.9rem; min-width: 70px; text-align: right;">${Utils.formatCurrency(item.subtotal)}</span>
        </div>
      </div>
    `).join('');
  },

  openCart() {
    const overlay = document.getElementById('cartDrawerOverlay');
    if (overlay) overlay.classList.remove('hidden');
    this.updateCartUI();
  },

  closeCart() {
    const overlay = document.getElementById('cartDrawerOverlay');
    if (overlay) overlay.classList.add('hidden');
  },

  openCheckout() {
    if (!this.cart.length) return;
    this.closeCart();

    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutSummaryItems = document.getElementById('checkoutSummaryItems');
    const checkoutTotalAmount = document.getElementById('checkoutTotalAmount');

    const total = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
    if (checkoutTotalAmount) checkoutTotalAmount.textContent = Utils.formatCurrency(total);

    if (checkoutSummaryItems) {
      checkoutSummaryItems.innerHTML = this.cart.map(i => `
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.3rem 0;">
          <span>${i.name} (${i.quantity}x)</span>
          <strong>${Utils.formatCurrency(i.subtotal)}</strong>
        </div>
      `).join('');
    }

    if (checkoutModal) checkoutModal.classList.remove('hidden');
  },

  closeCheckout() {
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) checkoutModal.classList.add('hidden');
  },

  async placeOrder() {
    const user = API.getCurrentUser();
    if (!user) return;

    const custName = document.getElementById('custNameInput').value.trim();
    const custPhone = document.getElementById('custPhoneInput').value.trim();
    const custNotes = document.getElementById('custNotesInput').value.trim();

    if (!custName || !custPhone) {
      Utils.showToast('Please enter your name and phone number', 'error');
      return;
    }

    const totalAmount = this.cart.reduce((sum, item) => sum + item.subtotal, 0);

    const orderPayload = {
      customerId: user.id,
      customerName: custName,
      customerPhone: custPhone,
      items: this.cart,
      totalAmount: totalAmount,
      paymentMethod: 'Cash on Pickup',
      notes: custNotes
    };

    const res = await API.createOrder(orderPayload);
    if (res && res.success) {
      this.cart = [];
      this.updateCartUI();
      this.closeCheckout();
      
      Utils.showToast(`🎉 Order #${res.order.id} placed! Status: Pending. Pickup PIN: ${res.order.pickupPin}`, 'success', 6000);
      
      await this.loadProducts();
      await this.loadNotifications();
      await this.loadMyOrdersCount();
      this.openOrdersModal();
    } else {
      Utils.showToast(res ? res.message : 'Failed to place order', 'error');
    }
  },

  async loadMyOrdersCount() {
    const user = API.getCurrentUser();
    if (!user) return;

    const res = await API.getOrders(user.id);
    const myOrdersCount = document.getElementById('myOrdersCount');
    if (myOrdersCount && res && res.orders) {
      myOrdersCount.textContent = res.orders.length;
    }
  },

  async openOrdersModal() {
    const user = API.getCurrentUser();
    if (!user) return;

    const modal = document.getElementById('ordersModal');
    const container = document.getElementById('customerOrdersContainer');
    if (!modal || !container) return;

    modal.classList.remove('hidden');
    container.innerHTML = `<div style="text-align: center; padding: 2rem;">Loading your orders...</div>`;

    const res = await API.getOrders(user.id);
    const orders = res && res.orders ? res.orders : [];

    if (!orders.length) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
          <span style="font-size: 3rem;">📦</span>
          <p style="margin-top: 0.5rem;">You have not placed any orders yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(o => {
      let statusClass = 'status-pending';
      if (o.status === 'Preparing') statusClass = 'status-preparing';
      if (o.status === 'Ready for Pickup') statusClass = 'status-ready';
      if (o.status === 'Completed') statusClass = 'status-completed';

      return `
        <div class="card" style="background: rgba(15,23,42,0.6); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
            <div>
              <span style="font-weight: 800; font-size: 1.1rem; color: var(--primary-light);">${o.id}</span>
              <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 0.75rem;">Placed on ${Utils.formatDateTime(o.timestamp)}</span>
            </div>
            <span class="status-badge ${statusClass}">${o.status}</span>
          </div>

          <!-- Timeline Stepper -->
          <div class="stepper">
            <div class="step ${['Pending','Preparing','Ready for Pickup','Completed'].includes(o.status) ? 'active' : ''}">
              <div class="step-icon">1</div>
              <span>Placed</span>
            </div>
            <div class="step ${['Preparing','Ready for Pickup','Completed'].includes(o.status) ? 'active' : ''}">
              <div class="step-icon">2</div>
              <span>Preparing</span>
            </div>
            <div class="step ${['Ready for Pickup','Completed'].includes(o.status) ? 'active' : ''}">
              <div class="step-icon">3</div>
              <span>Ready</span>
            </div>
            <div class="step ${o.status === 'Completed' ? 'active' : ''}">
              <div class="step-icon">4</div>
              <span>Picked Up</span>
            </div>
          </div>

          ${o.status === 'Ready for Pickup' ? `
            <div style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); border-radius: var(--radius-sm); padding: 0.85rem; margin: 0.75rem 0; text-align: center;">
              <div style="font-size: 1rem; font-weight: 800; color: #34d399;">🎉 ORDER READY FOR PICKUP!</div>
              <div style="font-size: 0.85rem; margin-top: 0.25rem;">Show Pickup PIN: <strong style="font-size: 1.2rem; letter-spacing: 2px; color: white; background: #064e3b; padding: 0.1rem 0.5rem; border-radius: 4px;">${o.pickupPin}</strong> to staff & pay <strong>${Utils.formatCurrency(o.totalAmount)} cash</strong>.</div>
            </div>
          ` : ''}

          <div style="margin-top: 0.75rem;">
            <strong style="font-size: 0.85rem; color: var(--text-muted);">Items Ordered:</strong>
            <ul style="list-style: none; font-size: 0.85rem; margin-top: 0.3rem;">
              ${o.items.map(i => `<li style="padding: 0.15rem 0;">• ${i.name} (${i.quantity}x) - ${Utils.formatCurrency(i.subtotal)}</li>`).join('')}
            </ul>
          </div>

          <div style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.82rem; color: var(--text-muted);">Payment Method: 💵 Cash on Pickup</span>
            <span style="font-size: 1.05rem; font-weight: 800;">Total: ${Utils.formatCurrency(o.totalAmount)}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  closeOrdersModal() {
    const modal = document.getElementById('ordersModal');
    if (modal) modal.classList.add('hidden');
  },

  async loadNotifications(silent = false) {
    const user = API.getCurrentUser();
    if (!user) return;

    const res = await API.getNotifications(user.id);
    if (!res) return;

    const notifCount = document.getElementById('notifCount');
    const notifList = document.getElementById('notifList');

    if (notifCount) {
      if (res.unreadCount > 0) {
        notifCount.textContent = res.unreadCount;
        notifCount.classList.remove('hidden');
      } else {
        notifCount.classList.add('hidden');
      }
    }

    if (!notifList) return;

    if (!res.notifications || !res.notifications.length) {
      notifList.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No notifications yet</div>`;
      return;
    }

    notifList.innerHTML = res.notifications.map(n => `
      <div class="notif-item ${!n.read ? 'unread' : ''}">
        <div>${n.message}</div>
        <div class="notif-time">${Utils.formatDateTime(n.timestamp)}</div>
      </div>
    `).join('');
  }
};
