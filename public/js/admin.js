/**
 * Admin Portal & Dashboard Analytics Logic
 */

const AdminPortal = {

  // =====================================================
  // INITIALIZE
  // =====================================================

  async init() {

    this.bindEvents();

    await this.loadStats();

    setInterval(() => {

      const adminView =
        document.getElementById('adminView');

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

    // Export report
    const exportReportBtn =
      document.getElementById('exportReportBtn');

    if (exportReportBtn) {

      exportReportBtn.onclick = () => {
        this.exportSalesReport();
      };

    }


    // Staff management
    const openManageStaffBtn =
      document.getElementById('openManageStaffBtn');

    if (openManageStaffBtn) {

      openManageStaffBtn.onclick = () => {
        this.manageStaff();
      };

    }


    // Category management
    const openManageCatBtn =
      document.getElementById('openManageCatBtn');

    if (openManageCatBtn) {

      openManageCatBtn.onclick = () => {
        this.manageCategories();
      };

    }


    // Customer directory
    const openUserListBtn =
      document.getElementById('openUserListBtn');

    if (openUserListBtn) {

      openUserListBtn.onclick = () => {
        this.viewUserDirectory();
      };

    }


    // Reorder stock
    const reorderBtn =
      document.getElementById('reorderBtn');

    if (reorderBtn) {

      reorderBtn.onclick = () => {
        this.loadLowStock();
      };

    }

  },


  // =====================================================
  // LOAD ADMIN STATISTICS
  // =====================================================

  async loadStats() {

    try {

      const res =
        await API.getAdminStats();

      if (
        !res ||
        !res.stats
      ) {

        console.error(
          'Admin statistics could not be loaded.'
        );

        return;

      }

      const stats =
        res.stats;


      // -------------------------------
      // REVENUE
      // -------------------------------

      const revenueElement =
        document.getElementById('kpiRevenue');

      if (revenueElement) {

        const revenue =
          stats.totalRevenue ??
          stats.revenue ??
          0;

        if (
          typeof Utils !== 'undefined' &&
          typeof Utils.formatCurrency === 'function'
        ) {

          revenueElement.textContent =
            Utils.formatCurrency(revenue);

        } else {

          revenueElement.textContent =
            `Rs. ${Number(revenue).toLocaleString()}`;

        }

      }


      // -------------------------------
      // TOTAL ORDERS
      // -------------------------------

      const ordersElement =
        document.getElementById('kpiOrders');

      if (ordersElement) {

        ordersElement.textContent =
          stats.totalOrders ??
          stats.orders ??
          0;

      }


      // -------------------------------
      // ORDER STATUS
      // -------------------------------

      const ordersSubElement =
        document.getElementById('kpiOrdersSub');

      if (ordersSubElement) {

        const completed =
          stats.completedOrders ?? 0;

        const pending =
          stats.pendingOrders ??
          stats.pendingOrdersCount ??
          0;

        ordersSubElement.textContent =
          `${completed} Completed (${pending} Pending)`;

      }


      // -------------------------------
      // LOW STOCK
      // -------------------------------

      const lowStockElement =
        document.getElementById('kpiLowStock');

      if (lowStockElement) {

        lowStockElement.textContent =
          stats.lowStockCount ?? 0;

      }


      // -------------------------------
      // USERS
      // -------------------------------

      const usersElement =
        document.getElementById('kpiUsers');

      if (usersElement) {

        usersElement.textContent =
          stats.activeCustomers ??
          stats.customers ??
          stats.users ??
          0;

      }


      // -------------------------------
      // SALES CHART
      // -------------------------------

      this.renderSalesChart(stats);

    } catch (error) {

      console.error(
        'Error loading admin statistics:',
        error
      );

    }

  },


  // =====================================================
  // SALES CHART
  // =====================================================

  renderSalesChart(stats) {

    const canvas =
      document.getElementById('salesChart');

    if (!canvas) {
      return;
    }

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      return;
    }


    const width =
      canvas.width;

    const height =
      canvas.height;


    ctx.clearRect(
      0,
      0,
      width,
      height
    );


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
      Array.isArray(stats.salesByDay)
        ? stats.salesByDay
        : [];


    const data =
      days.map(day => {

        const found =
          sales.find(item => {

            if (
              !item ||
              !item.day
            ) {

              return false;

            }

            return (
              String(item.day)
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


    const maxVal =
      Math.max(
        ...data,
        1000
      );


    const padding = 40;

    const chartW =
      width - padding * 2;

    const chartH =
      height - padding * 2;


    // -------------------------------
    // GRID
    // -------------------------------

    ctx.strokeStyle =
      'rgba(255,255,255,0.08)';

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


    // -------------------------------
    // POINTS
    // -------------------------------

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


    // -------------------------------
    // GRADIENT
    // -------------------------------

    const gradient =
      ctx.createLinearGradient(
        0,
        padding,
        0,
        height - padding
      );


    gradient.addColorStop(
      0,
      'rgba(16,185,129,0.4)'
    );


    gradient.addColorStop(
      1,
      'rgba(16,185,129,0)'
    );


    // -------------------------------
    // AREA
    // -------------------------------

    if (points.length > 0) {

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


      ctx.lineTo(
        points[points.length - 1].x,
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

    }


    // -------------------------------
    // SALES LINE
    // -------------------------------

    if (points.length > 0) {

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

    }


    // -------------------------------
    // POINTS + LABELS
    // -------------------------------

    points.forEach(
      (point, index) => {

        // Circle

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


        // Revenue label

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


        // Day label

        ctx.fillStyle =
          '#9ca3af';

        ctx.fillText(
          days[index],
          point.x,
          height - 15
        );

      }
    );

  },


  // =====================================================
  // LOW STOCK / REORDER
  // =====================================================

  async loadLowStock() {

    try {

      const res =
        await API.getProducts();


      if (
        !res ||
        !res.success
      ) {

        alert(
          '❌ Unable to load products.'
        );

        return;

      }


      const products =
        Array.isArray(res.products)
          ? res.products
          : [];


      // Find products that need reorder

      const lowStockProducts =
        products.filter(product => {

          const stock =
            Number(
              product.stock || 0
            );


          const reorderLevel =
            Number(
              product.lowStockLimit || 15
            );


          return (
            stock <= reorderLevel
          );

        });


      // No low stock products

      if (
        lowStockProducts.length === 0
      ) {

        alert(
          '✅ No products require reorder.'
        );

        return;

      }


      // -------------------------------
      // PROCESS EACH PRODUCT
      // -------------------------------

      for (
        let index = 0;
        index < lowStockProducts.length;
        index++
      ) {

        const product =
          lowStockProducts[index];


        const currentStock =
          Number(
            product.stock || 0
          );


        const reorderLevel =
          Number(
            product.lowStockLimit || 15
          );


        // Ask quantity

        const quantity =
          prompt(
            `⚠️ PRODUCT REQUIRING REORDER\n\n` +
            `${index + 1}. ${product.name}\n\n` +
            `Current Stock: ${currentStock}\n` +
            `Reorder Level: ${reorderLevel}\n\n` +
            `Enter quantity to add:`,
            '10'
          );


        // User cancelled

        if (
          quantity === null
        ) {

          continue;

        }


        const addQuantity =
          Number(quantity);


        // Validate

        if (
          !Number.isInteger(addQuantity) ||
          addQuantity <= 0
        ) {

          alert(
            '❌ Please enter a valid positive whole number.'
          );

          continue;

        }


        const newStock =
          currentStock +
          addQuantity;


        try {

          // Update database

          const updateRes =
            await API.updateProduct(
              product.id,
              {
                stock: newStock
              }
            );


          if (
            updateRes &&
            updateRes.success
          ) {

            alert(
              `✅ REORDER SUCCESSFUL!\n\n` +
              `Product: ${product.name}\n` +
              `Old Stock: ${currentStock}\n` +
              `Added: ${addQuantity}\n` +
              `New Stock: ${newStock}`
            );

          } else {

            alert(
              `❌ Reorder failed.\n\n` +
              `${
                updateRes?.message ||
                'Unable to update stock.'
              }`
            );

          }

        } catch (error) {

          console.error(
            'Reorder update error:',
            error
          );


          alert(
            '❌ Failed to update product stock.'
          );

        }

      }


      // Refresh dashboard

      await this.loadStats();

    } catch (error) {

      console.error(
        'Low stock error:',
        error
      );


      alert(
        '❌ Unable to load low stock products.'
      );

    }

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
// START ADMIN PORTAL
// =======================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const adminView =
      document.getElementById('adminView');

    if (adminView) {

      AdminPortal.init();

    }

  }
);


// =======================================================
// STAFF MANAGEMENT
// =======================================================

window.openStaffManagement = async function () {

  try {

    const res = await fetch('/api/users');

    const data = await res.json();

    if (!data.success) {
      alert('Unable to load users.');
      return;
    }

    const users = data.users || [];

    const staffUsers = users.filter(
      user => user.role === 'staff'
    );

    let message = '👨‍💼 STAFF MANAGEMENT\n\n';

    if (staffUsers.length === 0) {

      message += 'No staff accounts found.\n';

    } else {

      staffUsers.forEach((user, index) => {

        message +=
          `${index + 1}. ${user.name}\n` +
          `   Email: ${user.email}\n` +
          `   Role: ${user.role}\n\n`;

      });

    }

    const action = prompt(
      message +
      '\n' +
      'Type ADD to create a staff account\n' +
      'Type DELETE to delete a staff account\n' +
      'Type CANCEL to close'
    );

    if (!action) return;

    const selectedAction =
      action.trim().toUpperCase();


    // ===================================================
    // ADD STAFF
    // ===================================================

    if (selectedAction === 'ADD') {

      const name = prompt(
        'Enter staff full name:'
      );

      if (!name) return;

      const email = prompt(
        'Enter staff email:'
      );

      if (!email) return;

      const password = prompt(
        'Enter staff password:'
      );

      if (!password) return;


      const createRes = await fetch(
        '/api/users',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            name: name,
            email: email,
            password: password,
            role: 'staff'
          })
        }
      );


      const createData =
        await createRes.json();


      if (
        createData.success
      ) {

        alert(
          '✅ Staff account created successfully!\n\n' +
          `Name: ${name}\n` +
          `Email: ${email}`
        );

      } else {

        alert(
          '❌ Failed to create staff account.\n\n' +
          (
            createData.message ||
            'Unknown error'
          )
        );

      }

      return;

    }


    // ===================================================
    // DELETE STAFF
    // ===================================================

    if (selectedAction === 'DELETE') {

      if (staffUsers.length === 0) {

        alert(
          'No staff accounts available.'
        );

        return;

      }


      const number =
        prompt(
          'Enter the number of the staff account to delete:\n\n' +
          staffUsers
            .map(
              (user, index) =>
                `${index + 1}. ${user.name} - ${user.email}`
            )
            .join('\n')
        );


      if (!number) return;


      const index =
        Number(number) - 1;


      if (
        !Number.isInteger(index) ||
        !staffUsers[index]
      ) {

        alert(
          '❌ Invalid staff number.'
        );

        return;

      }


      const user =
        staffUsers[index];


      const confirmDelete =
        confirm(
          `Delete this staff account?\n\n` +
          `Name: ${user.name}\n` +
          `Email: ${user.email}`
        );


      if (!confirmDelete) return;


      const deleteRes =
        await fetch(
          `/api/users/${user.id}`,
          {
            method: 'DELETE'
          }
        );


      const deleteData =
        await deleteRes.json();


      if (
        deleteData.success
      ) {

        alert(
          '✅ Staff account deleted successfully.'
        );

      } else {

        alert(
          '❌ Failed to delete staff account.\n\n' +
          (
            deleteData.message ||
            'Unknown error'
          )
        );

      }

      return;

    }


    if (
      selectedAction !== 'CANCEL'
    ) {

      alert(
        '❌ Invalid option.\n\n' +
        'Please use ADD, DELETE or CANCEL.'
      );

    }

  } catch (error) {

    console.error(
      'Staff management error:',
      error
    );

    alert(
      '❌ Unable to open Staff Management.'
    );

  }

};
