/**
 * Shop Staff Portal & Order Fulfillment Logic
 */
const StaffPortal = {
  activeTab: 'ordersTab',

  async init() {
    this.bindEvents();
    await this.loadOrders();
    await this.loadStockTable();

    // Poll orders and stock state every 3 seconds
    setInterval(() => {
      if (!document.getElementById('staffView').classList.contains('hidden')) {
        this.loadOrders();
        this.loadStockTable();
      }
    }, 3000);
  },

  bindEvents() {
    // Tabs Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');

        if (tabId === 'stockTab') this.loadStockTable();
        if (tabId === 'ordersTab') this.loadOrders();
      };
    });

    // Stock Filter Input
    const stockSearchInput = document.getElementById('stockSearchInput');
    if (stockSearchInput) {
      stockSearchInput.oninput = (e) => this.loadStockTable(e.target.value.trim());
    }

    // Add Product Modal Toggle
    const openAddProductBtn = document.getElementById('openAddProductBtn');
    const closeProductModalBtn = document.getElementById('closeProductModalBtn');
    const cancelProductBtn = document.getElementById('cancelProductBtn');
    const productForm = document.getElementById('productForm');

    if (openAddProductBtn) openAddProductBtn.onclick = () => this.openProductModal();
    if (closeProductModalBtn) closeProductModalBtn.onclick = () => this.closeProductModal();
    if (cancelProductBtn) cancelProductBtn.onclick = () => this.closeProductModal();

    if (productForm) {
      productForm.onsubmit = (e) => {
        e.preventDefault();
        this.saveProduct();
      };
    }
  },

  async loadOrders() {
    const res = await API.getOrders();
    const orders = res && res.orders ? res.orders : [];

    const pendingList = document.getElementById('pendingList');
    const preparingList = document.getElementById('preparingList');
    const readyList = document.getElementById('readyList');
    const completedList = document.getElementById('completedList');

    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const preparingOrders = orders.filter(o => o.status === 'Preparing');
    const readyOrders = orders.filter(o => o.status === 'Ready for Pickup');
    const completedOrders = orders.filter(o => o.status === 'Completed');

    document.getElementById('pendingCount').textContent = pendingOrders.length;
    document.getElementById('preparingCount').textContent = preparingOrders.length;
    document.getElementById('readyCount').textContent = readyOrders.length;
    document.getElementById('completedCount').textContent = completedOrders.length;

    if (pendingList) pendingList.innerHTML = this.renderOrderCards(pendingOrders, 'pending');
    if (preparingList) preparingList.innerHTML = this.renderOrderCards(preparingOrders, 'preparing');
    if (readyList) readyList.innerHTML = this.renderOrderCards(readyOrders, 'ready');
    if (completedList) completedList.innerHTML = this.renderOrderCards(completedOrders, 'completed');
  },

  renderOrderCards(orders, colType) {
    if (!orders.length) {
      return `<div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.8rem;">No orders</div>`;
    }

    return orders.map(o => `
      <div class="staff-order-card">
        <div class="staff-order-header">
          <span class="staff-order-id">${o.id}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${Utils.formatDateTime(o.timestamp)}</span>
        </div>

        <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.25rem;">
          👤 ${o.customerName} <span style="font-weight: 400; color: var(--text-muted);">(${o.customerPhone})</span>
        </div>

        <ul class="staff-order-items">
          ${o.items.map(i => `<li>• <strong>${i.quantity}x</strong> ${i.name} (${Utils.formatCurrency(i.subtotal)})</li>`).join('')}
        </ul>

        ${o.notes ? `<div style="font-size: 0.78rem; background: rgba(245,158,11,0.1); color: #fbbf24; padding: 0.35rem 0.5rem; border-radius: 4px; margin: 0.4rem 0;">📝 "${o.notes}"</div>` : ''}

        <div style="font-size: 0.85rem; font-weight: 800; color: white; margin: 0.4rem 0;">
          Total Payable: ${Utils.formatCurrency(o.totalAmount)}
        </div>

        ${o.status === 'Ready for Pickup' ? `<div style="font-size: 0.8rem; background: #064e3b; color: #34d399; padding: 0.3rem 0.5rem; border-radius: 4px; font-weight: 700; text-align: center; margin-bottom: 0.4rem;">Pickup PIN: ${o.pickupPin}</div>` : ''}

        <div class="staff-order-footer">
          ${colType === 'pending' ? `
            <button class="btn btn-primary btn-sm btn-block" onclick="StaffPortal.updateStatus('${o.id}', 'Preparing')">
              👨‍🍳 Start Preparing
            </button>
          ` : ''}

          ${colType === 'preparing' ? `
            <button class="btn btn-success btn-sm btn-block" onclick="StaffPortal.updateStatus('${o.id}', 'Ready for Pickup')">
              🔔 Mark Ready & Notify Customer ➔
            </button>
          ` : ''}

          ${colType === 'ready' ? `
            <button class="btn btn-primary btn-sm btn-block" onclick="StaffPortal.updateStatus('${o.id}', 'Completed')">
              💵 Complete & Collect Cash
            </button>
          ` : ''}

          ${colType !== 'completed' ? `
            <button class="btn btn-danger btn-sm btn-block" onclick="StaffPortal.updateStatus('${o.id}', 'Cancelled')">
              ❌ Cancel Order
            </button>
          ` : `
            <span style="font-size: 0.78rem; color: var(--primary); font-weight: 700; text-align: center;">✅ Order Fulfilled & Paid</span>
          `}
        </div>
      </div>
    `).join('');
  },

  async updateStatus(orderId, newStatus) {
    const res = await API.updateOrderStatus(orderId, newStatus);
    if (res && res.success) {
      Utils.showToast(`Order #${orderId} status changed to "${newStatus}"!`, 'success');
      
      if (newStatus === 'Ready for Pickup') {
        Utils.showToast(`🔔 Automated notification sent to Customer!`, 'info', 5000);
      }

      await this.loadOrders();
      await this.loadStockTable();
    } else {
      Utils.showToast(res ? res.message : 'Failed to update order status', 'error');
    }
  },

  async loadStockTable(query = '') {
    const body = document.getElementById('stockTableBody');
    if (!body) return;

    const res = await API.getProducts();
    let products = res && res.products ? res.products : [];

    if (query) {
      const q = query.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q));
    }

    body.innerHTML = products.map(p => {
      const isLow = p.stock <= (p.lowStockLimit || 5);
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.4rem;">${p.image || '🛒'}</span>
              <div>
                <strong>${p.name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.unit}</div>
              </div>
            </div>
          </td>
          <td>${p.categoryName || 'General'}</td>
          <td><strong>${Utils.formatCurrency(p.price)}</strong></td>
          <td>
            <span style="font-weight: 800; font-size: 1.05rem; ${isLow ? 'color: #f43f5e;' : ''}">
              ${p.stock} units
            </span>
          </td>
          <td>
            ${p.stock <= 0 
              ? `<span class="badge" style="background: rgba(244,63,94,0.2); color:#f43f5e;">Out of Stock</span>`
              : isLow 
              ? `<span class="badge" style="background: rgba(245,158,11,0.2); color:#fbbf24;">Low Stock Warning</span>`
              : `<span class="badge" style="background: rgba(16,185,129,0.15); color:#34d399;">Normal</span>`
            }
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="StaffPortal.quickAddStock('${p.id}', 10)">+10 Stock</button>
              <button class="btn btn-secondary btn-sm" onclick="StaffPortal.openProductModal('${p.id}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="StaffPortal.deleteProduct('${p.id}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async quickAddStock(productId, count) {
    const res = await API.getProducts();
    const products = res ? res.products : [];
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const newStock = prod.stock + count;
    await API.updateProduct(productId, { stock: newStock });
    Utils.showToast(`Updated ${prod.name} stock to ${newStock}!`, 'success');
    this.loadStockTable();
  },

  async openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const catSelect = document.getElementById('prodCategorySelect');

    // Populate category dropdown
    const catRes = await API.getCategories();
    if (catSelect && catRes && catRes.categories) {
      catSelect.innerHTML = catRes.categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    }

    if (productId) {
      title.textContent = '✏️ Edit Product';
      const prodRes = await API.getProducts();
      const prod = prodRes.products.find(p => p.id === productId);
      if (prod) {
        document.getElementById('prodIdInput').value = prod.id;
        document.getElementById('prodNameInput').value = prod.name;
        document.getElementById('prodCategorySelect').value = prod.category;
        document.getElementById('prodUnitInput').value = prod.unit;
        document.getElementById('prodPriceInput').value = prod.price;
        document.getElementById('prodStockInput').value = prod.stock;
        document.getElementById('prodImageInput').value = prod.image || '🍎';
        document.getElementById('prodDescInput').value = prod.description || '';
      }
    } else {
      title.textContent = '➕ Add New Grocery Product';
      document.getElementById('productForm').reset();
      document.getElementById('prodIdInput').value = '';
    }

    modal.classList.remove('hidden');
  },

  closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
  },

  async saveProduct() {
    const id = document.getElementById('prodIdInput').value;
    const name = document.getElementById('prodNameInput').value.trim();
    const category = document.getElementById('prodCategorySelect').value;
    const catSelect = document.getElementById('prodCategorySelect');
    const categoryName = catSelect.options[catSelect.selectedIndex].text.replace(/^[^\s]+\s/, '');
    const unit = document.getElementById('prodUnitInput').value.trim();
    const price = Number(document.getElementById('prodPriceInput').value);
    const stock = Number(document.getElementById('prodStockInput').value);
    const image = document.getElementById('prodImageInput').value.trim() || '🛒';
    const description = document.getElementById('prodDescInput').value.trim();

    const productPayload = { name, category, categoryName, unit, price, stock, image, description };

    if (id) {
      await API.updateProduct(id, productPayload);
      Utils.showToast(`Updated product "${name}"!`, 'success');
    } else {
      await API.addProduct(productPayload);
      Utils.showToast(`Added new product "${name}"!`, 'success');
    }

    this.closeProductModal();
    await this.loadStockTable();
    await CustomerPortal.loadProducts();
  },

  async deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
      await API.deleteProduct(productId);
      Utils.showToast('Product deleted!', 'info');
      await this.loadStockTable();
      await CustomerPortal.loadProducts();
    }
  }
};
