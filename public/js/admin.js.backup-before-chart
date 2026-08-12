/**
 * Admin Portal & Dashboard Analytics Logic
 */
const AdminPortal = {
  async init() {
    this.bindEvents();
    await this.loadStats();

    // Poll stats every 4 seconds
    setInterval(() => {
      if (!document.getElementById('adminView').classList.contains('hidden')) {
        this.loadStats();
      }
    }, 4000);
  },

  bindEvents() {
    const exportReportBtn = document.getElementById('exportReportBtn');
    if (exportReportBtn) {
      exportReportBtn.onclick = () => this.exportSalesReport();
    }

    const openManageStaffBtn = document.getElementById('openManageStaffBtn');
    if (openManageStaffBtn) {
      openManageStaffBtn.onclick = () => this.manageStaff();
    }

    const openManageCatBtn = document.getElementById('openManageCatBtn');
    if (openManageCatBtn) {
      openManageCatBtn.onclick = () => this.manageCategories();
    }

    const openUserListBtn = document.getElementById('openUserListBtn');
    if (openUserListBtn) {
      openUserListBtn.onclick = () => this.viewUserDirectory();
    }
  },

  async loadStats() {
    const res = await API.getAdminStats();
    if (!res || !res.stats) return;

    const stats = res.stats;

    document.getElementById('kpiRevenue').textContent = Utils.formatCurrency(stats.totalRevenue);
    document.getElementById('kpiOrders').textContent = stats.totalOrders;
    document.getElementById('kpiOrdersSub').textContent = `${stats.completedOrders} Completed (${stats.pendingOrdersCount} Pending)`;
    document.getElementById('kpiLowStock').textContent = stats.lowStockCount;
    document.getElementById('kpiUsers').textContent = stats.activeCustomers;

    this.renderSalesChart(stats);
  },

  // Render HTML5 Canvas Sales Chart
  renderSalesChart(stats) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Data points (simulated daily revenue pattern over past 7 days)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totalRev = stats.totalRevenue || 12500;
    const baseVal = totalRev / 7;
    const data = [
      Math.round(baseVal * 0.7),
      Math.round(baseVal * 0.9),
      Math.round(baseVal * 1.1),
      Math.round(baseVal * 0.8),
      Math.round(baseVal * 1.4),
      Math.round(baseVal * 1.6),
      Math.round(totalRev * 0.3)
    ];

    const maxVal = Math.max(...data, 1000);
    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw Gradient Area under Line
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    const points = [];
    data.forEach((val, idx) => {
      const x = padding + (chartW / (data.length - 1)) * idx;
      const y = height - padding - (val / maxVal) * chartH;
      points.push({ x, y });
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // Complete gradient path
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.lineTo(points[0].x, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Line
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw Data Dots & Labels
    points.forEach((pt, idx) => {
      // Dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Day Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(days[idx], pt.x, height - 12);
    });
  },

  exportSalesReport() {
    Utils.showToast('📥 Exporting Sales Summary Report (CSV)...', 'info');
    setTimeout(() => {
      const csvContent = "data:text/csv;charset=utf-8," + 
        "Date,Order ID,Customer,Total Amount,Payment Method,Status\n" +
        "2026-08-06,ORD-9021,Kasun Perera,1420,Cash on Pickup,Ready for Pickup\n" +
        "2026-08-06,ORD-9020,Kamal Fernando,760,Cash on Pickup,Completed\n";

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `grocery_sales_report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Utils.showToast('Sales Report downloaded successfully!', 'success');
    }, 1000);
  },

  async manageStaff() {
    const res = await API.getUsers();
    const users = res && res.users ? res.users : [];
    const staff = users.filter(u => u.role === 'staff' || u.role === 'admin');

    const names = staff.map(s => `• ${s.name} (${s.email} - Role: ${s.role.toUpperCase()})`).join('\n');
    alert(`👨‍💼 Shop Staff & Managers:\n\n${names}\n\n[System note: New staff members can be invited via backend management API]`);
  },

  async manageCategories() {
    const res = await API.getCategories();
    const cats = res && res.categories ? res.categories : [];
    const names = cats.map(c => `• ${c.icon} ${c.name}`).join('\n');
    alert(`🏷️ Current Product Categories:\n\n${names}\n\n[You can manage category rules in the inventory controller]`);
  },

  async viewUserDirectory() {
    const res = await API.getUsers();
    const users = res && res.users ? res.users : [];
    const customers = users.filter(u => u.role === 'customer');

    const names = customers.map(c => `• ${c.name} (${c.email} | ${c.phone})`).join('\n');
    alert(`👥 Registered Customers:\n\n${names}`);
  }
};
