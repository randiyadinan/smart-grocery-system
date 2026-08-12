/**
 * Main Application Initializer & Role Auth Router
 */
const AuthPortal = {
  selectedRole: 'customer',

  init() {
    this.bindEvents();
    this.checkSession();
  },

  bindEvents() {
    // Toggle Customer Login vs Register Forms
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (showLoginBtn && showRegisterBtn) {
      showLoginBtn.onclick = () => {
        showLoginBtn.classList.add('active');
        showRegisterBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      };
      showRegisterBtn.onclick = () => {
        showRegisterBtn.classList.add('active');
        showLoginBtn.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      };
    }

    // Submit Customer Login
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        const res = await API.login(email, password, 'customer');
        if (res && res.success) {
          Utils.showToast(`Welcome back, ${res.user.name}!`, 'success');
          this.checkSession();
        } else {
          Utils.showToast(res ? res.message : 'Invalid customer credentials', 'error');
        }
      };
    }

    // Submit Customer Register
    if (registerForm) {
      registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value.trim();

        if (!name || !email || !password) {
          Utils.showToast('Please fill out all required fields', 'error');
          return;
        }

        const res = await API.register(name, email, phone, password, 'customer');
        if (res && res.success) {
          Utils.showToast(`🎉 Customer Account created! Welcome, ${res.user.name}.`, 'success');
          this.checkSession();
        } else {
          Utils.showToast(res ? res.message : 'Failed to create account', 'error');
        }
      };
    }

    // Staff & Admin Auth Modal Toggles
    const openStaffAuthBtn = document.getElementById('openStaffAuthBtn');
    const closeStaffAuthBtn = document.getElementById('closeStaffAuthBtn');
    const cancelStaffAuthBtn = document.getElementById('cancelStaffAuthBtn');
    const staffAuthModal = document.getElementById('staffAuthModal');
    const staffAuthForm = document.getElementById('staffAuthForm');
    const staffRoleSelect = document.getElementById('staffRoleSelect');
    const staffEmailInput = document.getElementById('staffEmailInput');
    const staffPasswordInput = document.getElementById('staffPasswordInput');

    if (openStaffAuthBtn) {
      openStaffAuthBtn.onclick = () => {
        staffAuthModal.classList.remove('hidden');
      };
    }
    if (closeStaffAuthBtn) closeStaffAuthBtn.onclick = () => staffAuthModal.classList.add('hidden');
    if (cancelStaffAuthBtn) cancelStaffAuthBtn.onclick = () => staffAuthModal.classList.add('hidden');

    if (staffRoleSelect) {
      staffRoleSelect.onchange = (e) => {
        const role = e.target.value;
        if (role === 'staff') {
          staffEmailInput.value = 'staff@grocery.com';
          staffPasswordInput.value = 'staff123';
        } else {
          staffEmailInput.value = 'admin@grocery.com';
          staffPasswordInput.value = 'admin123';
        }
      };
    }

    if (staffAuthForm) {
      staffAuthForm.onsubmit = async (e) => {
        e.preventDefault();
        const role = staffRoleSelect.value;
        const email = staffEmailInput.value.trim();
        const password = staffPasswordInput.value.trim();

        const res = await API.login(email, password, role);
        if (res && res.success) {
          staffAuthModal.classList.add('hidden');
          Utils.showToast(`Welcome to ${role.toUpperCase()} Portal, ${res.user.name}!`, 'success');
          this.checkSession();
        } else {
          Utils.showToast(res ? res.message : 'Invalid staff credentials', 'error');
        }
      };
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        API.clearSession();
        Utils.showToast('You have been logged out.', 'info');
        this.checkSession();
      };
    }
  },

  fillDemo(role) {
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');

    if (role === 'customer') {
      loginEmail.value = 'kasun@gmail.com';
      loginPassword.value = 'customer123';
      document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    } else if (role === 'staff') {
      API.login('staff@grocery.com', 'staff123', 'staff').then(res => {
        if (res && res.success) {
          Utils.showToast('Logged in as Staff!', 'success');
          this.checkSession();
        }
      });
    } else if (role === 'admin') {
      API.login('admin@grocery.com', 'admin123', 'admin').then(res => {
        if (res && res.success) {
          Utils.showToast('Logged in as Admin!', 'success');
          this.checkSession();
        }
      });
    }
  },

  checkSession() {
    const user = API.getCurrentUser();
    const authView = document.getElementById('authView');
    const customerView = document.getElementById('customerView');
    const staffView = document.getElementById('staffView');
    const adminView = document.getElementById('adminView');

    const userProfileBar = document.getElementById('userProfileBar');
    const headerActions = document.getElementById('headerActions');

    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');

    if (!user) {
      // Not logged in -> Show Customer Auth Portal
      authView.classList.remove('hidden');
      customerView.classList.add('hidden');
      staffView.classList.add('hidden');
      adminView.classList.add('hidden');

      if (userProfileBar) userProfileBar.classList.add('hidden');
      if (headerActions) headerActions.classList.add('hidden');
      return;
    }

    // Logged in -> Update Profile Badge
    if (userProfileBar) userProfileBar.classList.remove('hidden');
    if (userName) userName.textContent = user.name;
    if (userRole) userRole.textContent = user.role.toUpperCase();

    if (user.role === 'customer') {
      if (userAvatar) userAvatar.textContent = '👤';
      if (headerActions) headerActions.classList.remove('hidden');

      authView.classList.add('hidden');
      customerView.classList.remove('hidden');
      staffView.classList.add('hidden');
      adminView.classList.add('hidden');

      CustomerPortal.init();
    } else if (user.role === 'staff') {
      if (userAvatar) userAvatar.textContent = '👨‍🍳';
      if (headerActions) headerActions.classList.add('hidden');

      authView.classList.add('hidden');
      customerView.classList.add('hidden');
      staffView.classList.remove('hidden');
      adminView.classList.add('hidden');

      StaffPortal.init();
    } else if (user.role === 'admin') {
      if (userAvatar) userAvatar.textContent = '📊';
      if (headerActions) headerActions.classList.add('hidden');

      authView.classList.add('hidden');
      customerView.classList.add('hidden');
      staffView.classList.add('hidden');
      adminView.classList.remove('hidden');

      AdminPortal.init();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('🛒 Smart Grocery Auth Router Initialized!');
  AuthPortal.init();
});
