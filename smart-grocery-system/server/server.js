const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  console.log(`[${new Date().toLocaleTimeString()}] ${method} ${pathname}`);

  try {
    // --- AUTHENTICATION ENDPOINTS ---
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseRequestBody(req);
      if (!body.email || !body.password) {
        return sendJSON(res, { success: false, message: 'Email and password are required' }, 400);
      }
      const authResult = db.authenticate(body.email, body.password, body.role);
      if (!authResult.success) {
        return sendJSON(res, authResult, 401);
      }
      return sendJSON(res, authResult);
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseRequestBody(req);
      if (!body.name || !body.email || !body.password) {
        return sendJSON(res, { success: false, message: 'Name, email, and password are required' }, 400);
      }
      const regResult = db.registerUser(body);
      if (!regResult.success) {
        return sendJSON(res, regResult, 400);
      }
      return sendJSON(res, regResult, 201);
    }

    // --- PRODUCTS ENDPOINTS ---
    if (pathname === '/api/products' && method === 'GET') {
      const category = urlObj.searchParams.get('category');
      const search = urlObj.searchParams.get('search');
      let products = db.getProducts();

      if (category && category !== 'all') {
        products = products.filter(p => p.category === category);
      }
      if (search) {
        const query = search.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
      }
      return sendJSON(res, { success: true, products });
    }

    if (pathname === '/api/products' && method === 'POST') {
      const body = await parseRequestBody(req);
      if (!body.name || !body.price || !body.stock) {
        return sendJSON(res, { success: false, message: 'Name, price and stock are required' }, 400);
      }
      const newProduct = db.addProduct(body);
      return sendJSON(res, { success: true, product: newProduct }, 201);
    }

    if (pathname.startsWith('/api/products/') && method === 'PUT') {
      const id = pathname.replace('/api/products/', '');
      const body = await parseRequestBody(req);
      const updated = db.updateProduct(id, body);
      if (!updated) return sendJSON(res, { success: false, message: 'Product not found' }, 404);
      return sendJSON(res, { success: true, product: updated });
    }

    if (pathname.startsWith('/api/products/') && method === 'DELETE') {
      const id = pathname.replace('/api/products/', '');
      const deleted = db.deleteProduct(id);
      if (!deleted) return sendJSON(res, { success: false, message: 'Product not found' }, 404);
      return sendJSON(res, { success: true, message: 'Product deleted', product: deleted });
    }

    // --- CATEGORIES ENDPOINTS ---
    if (pathname === '/api/categories' && method === 'GET') {
      return sendJSON(res, { success: true, categories: db.getCategories() });
    }

    if (pathname === '/api/categories' && method === 'POST') {
      const body = await parseRequestBody(req);
      if (!body.name) return sendJSON(res, { success: false, message: 'Category name required' }, 400);
      const newCat = db.addCategory(body);
      return sendJSON(res, { success: true, category: newCat }, 201);
    }

    if (pathname.startsWith('/api/categories/') && method === 'DELETE') {
      const id = pathname.replace('/api/categories/', '');
      const deleted = db.deleteCategory(id);
      return sendJSON(res, { success: true, category: deleted });
    }

    // --- ORDERS ENDPOINTS ---
    if (pathname === '/api/orders' && method === 'GET') {
      const customerId = urlObj.searchParams.get('customerId');
      let orders = db.getOrders();
      if (customerId) {
        orders = orders.filter(o => o.customerId === customerId);
      }
      return sendJSON(res, { success: true, orders });
    }

    if (pathname === '/api/orders' && method === 'POST') {
      const body = await parseRequestBody(req);
      if (!body.items || !body.items.length) {
        return sendJSON(res, { success: false, message: 'Cart items required' }, 400);
      }
      const order = db.createOrder(body);
      return sendJSON(res, { success: true, order }, 201);
    }

    if (pathname.match(/^\/api\/orders\/[^\/]+\/status$/) && method === 'PATCH') {
      const orderId = pathname.split('/')[3];
      const body = await parseRequestBody(req);
      if (!body.status) return sendJSON(res, { success: false, message: 'Status required' }, 400);
      
      const updatedOrder = db.updateOrderStatus(orderId, body.status);
      if (!updatedOrder) return sendJSON(res, { success: false, message: 'Order not found' }, 404);
      return sendJSON(res, { success: true, order: updatedOrder });
    }

    // --- NOTIFICATIONS ENDPOINTS ---
    if (pathname === '/api/notifications' && method === 'GET') {
      const customerId = urlObj.searchParams.get('customerId');
      const notifications = db.getNotifications(customerId);
      const unreadCount = notifications.filter(n => !n.read).length;
      return sendJSON(res, { success: true, notifications, unreadCount });
    }

    if (pathname === '/api/notifications/read' && method === 'POST') {
      const body = await parseRequestBody(req);
      db.markNotificationsRead(body.customerId);
      return sendJSON(res, { success: true, message: 'Notifications marked as read' });
    }

    // --- ADMIN & USERS ENDPOINTS ---
    if (pathname === '/api/admin/stats' && method === 'GET') {
      return sendJSON(res, { success: true, stats: db.getAdminStats() });
    }

    if (pathname === '/api/users' && method === 'GET') {
      return sendJSON(res, { success: true, users: db.getUsers() });
    }

    if (pathname === '/api/users' && method === 'POST') {
      const body = await parseRequestBody(req);
      if (!body.name || !body.email) {
        return sendJSON(res, { success: false, message: 'Name and email are required' }, 400);
      }
      const newUser = db.registerUser(body);
      return sendJSON(res, { success: true, user: newUser }, 201);
    }

    if (pathname.startsWith('/api/users/') && method === 'DELETE') {
      const id = pathname.replace('/api/users/', '');
      const deleted = db.deleteUser(id);
      return sendJSON(res, { success: true, user: deleted });
    }

    // --- STATIC FILES ---
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexPath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    }

  } catch (err) {
    console.error('Server error:', err);
    sendJSON(res, { success: false, message: 'Internal Server Error', error: err.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Smart Grocery System Auth Server Running!`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
