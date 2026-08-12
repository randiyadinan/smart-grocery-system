/**
 * Admin Portal & Dashboard Analytics Logic
 */

const AdminPortal = {

  async init() {
    this.bindEvents();

    await this.loadStats();

    // Refresh statistics every 4 seconds
    setInterval(() => {

      const adminView = document.getElementById('adminView');

      if (
        adminView &&
        !adminView.classList.contains('hidden')
      ) {
        this.loadStats();
      }

    }, 4000);
  },


  // =====================================================
  // EVENT BINDINGS
  // =====================================================

  bindEvents() {

    const exportReportBtn =
      document.getElementById('exportReportBtn');

    if (exportReportBtn) {

      exportReportBtn.onclick = () => {
        this.exportSalesReport();
      };

    }


    const openManageStaffBtn =
      document.getElementById('openManageStaffBtn');

    if (openManageStaffBtn) {

      openManageStaffBtn.onclick = () => {
        this.manageStaff();
      };

    }


    const openManageCatBtn =
      document.getElementById('openManageCatBtn');

    if (openManageCatBtn) {

      openManageCatBtn.onclick = () => {
        this.manageCategories();
      };

    }


    const openUserListBtn =
      document.getElementById('openUserListBtn');

    if (openUserListBtn) {

      openUserListBtn.onclick = () => {
        this.viewUserDirectory();
      };

    }
  },


  // =====================================================
  // LOAD ADMIN STATISTICS
  // =====================================================

  async loadStats() {

    try {

      const res = await API.getAdminStats();

      if (!res || !res.stats) {
        console.error(
          'Admin statistics could not be loaded.'
        );
        return;
      }

      const stats = res.stats;


      // -----------------------------
      // Revenue
      // -----------------------------

      const revenueElement =
        document.getElementById('kpiRevenue');

      if (revenueElement) {

        const revenue =
          stats.totalRevenue ??
          stats.revenue ??
          0;

        revenueElement.textContent =
          Utils.formatCurrency(revenue);
      }


      // -----------------------------
      // Orders
      // -----------------------------

      const ordersElement =
        document.getElementById('kpiOrders');

      if (ordersElement) {

        ordersElement.textContent =
          stats.totalOrders ??
          stats.orders ??
          0;
      }


      // -----------------------------
      // Order Status
      // -----------------------------

      const ordersSubElement =
        document.getElementById('kpiOrdersSub');

      if (ordersSubElement) {

        const completed =
          stats.completedOrders ?? 0;

        const pending =
          stats.pendingOrdersCount ?? 0;

        ordersSubElement.textContent =
          `${completed} Completed (${pending} Pending)`;
      }


      // -----------------------------
      // Low Stock
      // -----------------------------

      const lowStockElement =
        document.getElementById('kpiLowStock');

      if (lowStockElement) {

        lowStockElement.textContent =
          stats.lowStockCount ?? 0;
      }


      // -----------------------------
      // Customers
      // -----------------------------

      const usersElement =
        document.getElementById('kpiUsers');

      if (usersElement) {

        usersElement.textContent =
          stats.activeCustomers ??
          stats.users ??
          0;
      }


      // -----------------------------
      // Sales Chart
      // -----------------------------

      this.renderSalesChart(stats);

    } catch (error) {

      console.error(
        'Error loading admin statistics:',
        error
      );

    }
  },


  // =====================================================
  // SALES PERFORMANCE CHART
  // =====================================================

  renderSalesChart(stats) {

    const canvas =
      document.getElementById('salesChart');

    if (!canvas) {
      return;
    }


    const ctx =
      canvas.getContext('2d');

    const width =
      canvas.width;

    const height =
      canvas.height;


    // Clear previous chart

    ctx.clearRect(
      0,
      0,
      width,
      height
    );


    // ===================================================
    // ACTUAL DATABASE SALES DATA
    // ===================================================

    const days = [
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun'
    ];


    const sales =
      stats.salesByDay || [];


    // Create seven days of data

    const data =
      days.map(day => {

        const found =
          sales.find(item => {

            if (!item || !item.day) {
              return false;
            }

            return (
              item.day
                .trim()
                .toLowerCase() ===
              day.toLowerCase()
            );

          });


        if (found) {

          return Number(
            found.revenue
          ) || 0;

        }

        return 0;

      });


    // ===================================================
    // CHART SETTINGS
    // ===================================================

    const maxVal =
      Math.max(
        ...data,
        1000
      );


    const padding = 40;

    const chartW =
      width -
      padding * 2;

    const chartH =
      height -
      padding * 2;


    // ===================================================
    // GRID LINES
    // ===================================================

    ctx.strokeStyle =
      'rgba(255, 255, 255, 0.08)';

    ctx.lineWidth = 1;


    for (
      let i = 0;
      i <= 4;
      i++
    ) {

      const y =
        padding +
        (chartH / 4) * i;


      ctx.beginPath();

      ctx.moveTo(
        padding,
        y
      );

      ctx.lineTo(
        width - padding,
        y
      );

      ctx.stroke();
    }


    // ===================================================
    // CREATE DATA POINTS
    // ===================================================

    const points =
      data.map(
        (value, index) => {

          const x =
            padding +
            (
              chartW /
              (data.length - 1)
            ) *
            index;


          const y =
            height -
            padding -
            (
              value /
              maxVal
            ) *
            chartH;


          return {
            x,
            y,
            value
          };

        }
      );


    // ===================================================
    // GRADIENT AREA
    // ===================================================

    const gradient =
      ctx.createLinearGradient(
        0,
        padding,
        0,
        height - padding
      );


    gradient.addColorStop(
      0,
      'rgba(16, 185, 129, 0.4)'
    );


    gradient.addColorStop(
      1,
      'rgba(16, 185, 129, 0)'
    );


    ctx.beginPath();


    points.forEach(
      (point, index) => {

        if (index === 0) {

          ctx.moveTo(
            point.x,
            point.y
          );

        } else {

          ctx.lineTo(
            point.x,
            point.y
          );

        }

      }
    );


    // Complete area

    ctx.lineTo(
      points[
        points.length - 1
      ].x,
      height - padding
    );


    ctx.lineTo(
      points[0].x,
      height - padding
    );


    ctx.closePath();


    ctx.fillStyle =
      gradient;

    ctx.fill();


    // ===================================================
    // DRAW SALES LINE
    // ===================================================

    ctx.beginPath();


    points.forEach(
      (point, index) => {

        if (index === 0) {

          ctx.moveTo(
            point.x,
            point.y
          );

        } else {

          ctx.lineTo(
            point.x,
            point.y
          );

        }

      }
    );


    ctx.strokeStyle =
      '#10b981';

    ctx.lineWidth = 3;

    ctx.stroke();


    // ===================================================
    // DATA DOTS + LABELS
    // ===================================================

    points.forEach(
      (point, index) => {


        // ---------------------------
        // Dot
        // ---------------------------

        ctx.beginPath();

        ctx.arc(
          point.x,
          point.y,
          5,
          0,
          Math.PI * 2
        );


        ctx.fillStyle =
          '#ffffff';

        ctx.fill();


        ctx.strokeStyle =
          '#059669';

        ctx.lineWidth = 2;

        ctx.stroke();


        // ---------------------------
        // Revenue value
        // ---------------------------

        ctx.fillStyle =
          '#ffffff';

        ctx.font =
          '12px Arial';

        ctx.textAlign =
          'center';


        ctx.fillText(
          `Rs. ${point.value.toLocaleString()}`,
          point.x,
          point.y - 12
        );


        // ---------------------------
        // Day label
        // ---------------------------

        ctx.fillStyle =
          '#9ca3af';

        ctx.font =
          '12px Arial';


        ctx.fillText(
          days[index],
          point.x,
          height - 15
        );

      }
    );

  },


  // =====================================================
  // EXPORT SALES REPORT
  // =====================================================

  exportSalesReport() {

    window.print();

  },


  // =====================================================
  // STAFF MANAGEMENT
  // =====================================================

  manageStaff() {

    if (
      typeof window.openStaffManagement ===
      'function'
    ) {

      window.openStaffManagement();

    } else {

      alert(
        'Staff Management is not available yet.'
      );

    }

  },


  // =====================================================
  // CATEGORY MANAGEMENT
  // =====================================================

  manageCategories() {

    if (
      typeof window.openCategoryManagement ===
      'function'
    ) {

      window.openCategoryManagement();

    } else {

      alert(
        'Category Manager is not available yet.'
      );

    }

  },


  // =====================================================
  // CUSTOMER DIRECTORY
  // =====================================================

  viewUserDirectory() {

    if (
      typeof window.openCustomerDirectory ===
      'function'
    ) {

      window.openCustomerDirectory();

    } else {

      alert(
        'Customer Directory is not available yet.'
      );

    }

  }

};


// =======================================================
// INITIALIZE ADMIN PORTAL
// =======================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    if (
      document.getElementById('adminView')
    ) {

      AdminPortal.init();

    }

  }
);/**
 * Admin Portal & Dashboard Analytics Logic
 */
