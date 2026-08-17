require('dotenv').config();

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
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods':
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization'
  });

  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`
  );

  const pathname = urlObj.pathname;
  const method = req.method;

  // ==================== CORS ====================

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods':
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization'
    });

    return res.end();
  }

  console.log(
    `[${new Date().toLocaleTimeString()}] ${method} ${pathname}`
  );

  try {

    // ==================================================
    // AUTH LOGIN
    // ==================================================

    if (
      pathname === '/api/auth/login' &&
      method === 'POST'
    ) {
      try {
        const body = await parseRequestBody(req);

        console.log('Login request:', {
          email: body.email,
          role: body.role
        });

        if (!body.email || !body.password) {
          return sendJSON(res, {
            success: false,
            message: 'Email and password are required'
          }, 400);
        }

        const result = await db.authenticate(
          body.email,
          body.password,
          body.role || 'customer'
        );

        if (!result.success) {
          return sendJSON(res, result, 401);
        }

        return sendJSON(res, result, 200);

      } catch (error) {
        console.error(
          'POST /api/auth/login error:',
          error
        );

        return sendJSON(res, {
          success: false,
          message: error.message || 'Login failed'
        }, 500);
      }
    }

    // ==================================================
    // AUTH REGISTER
    // ==================================================

    if (
      pathname === '/api/auth/register' &&
      method === 'POST'
    ) {
      try {
        const body = await parseRequestBody(req);

        if (
          !body.name ||
          !body.email ||
          !body.password
        ) {
          return sendJSON(res, {
            success: false,
            message:
              'Name, email, and password are required'
          }, 400);
        }

        const result =
          await db.registerUser(body);

        if (!result.success) {
          return sendJSON(res, result, 400);
        }

        return sendJSON(res, result, 201);

      } catch (error) {
        console.error(
          'POST /api/auth/register error:',
          error
        );

        return sendJSON(res, {
          success: false,
          message:
            error.message || 'Registration failed'
        }, 500);
      }
    }

    // ==================================================
    // PRODUCTS GET
    // ==================================================

    if (
      pathname === '/api/products' &&
      method === 'GET'
    ) {
      const category =
        urlObj.searchParams.get('category');

      const search =
        urlObj.searchParams.get('search');

      let products =
        await db.getProducts();

      if (
        category &&
        category !== 'all'
      ) {
        products = products.filter(product =>
          String(product.category || '')
            .toLowerCase() ===
          category.toLowerCase()
        );
      }

      if (search) {
        const query =
          search.toLowerCase();

        products = products.filter(product => {
          const name =
            String(product.name || '')
              .toLowerCase();

          const description =
            String(product.description || '')
              .toLowerCase();

          return (
            name.includes(query) ||
            description.includes(query)
          );
        });
      }

      return sendJSON(res, {
        success: true,
        products
      });
    }

    // ==================================================
    // PRODUCTS POST
    // ==================================================

    if (
      pathname === '/api/products' &&
      method === 'POST'
    ) {
      const body =
        await parseRequestBody(req);

      if (
        !body.name ||
        body.price === undefined ||
        body.stock === undefined
      ) {
        return sendJSON(res, {
          success: false,
          message:
            'Name, price and stock are required'
        }, 400);
      }

      const product =
        await db.addProduct(body);

      return sendJSON(res, {
        success: true,
        product
      }, 201);
    }

    // ==================================================
    // PRODUCTS PUT
    // ==================================================

    if (
      pathname.startsWith('/api/products/') &&
      method === 'PUT'
    ) {
      const id =
        pathname.replace('/api/products/', '');

      const body =
        await parseRequestBody(req);

      const product =
        await db.updateProduct(id, body);

      if (!product) {
        return sendJSON(res, {
          success: false,
          message: 'Product not found'
        }, 404);
      }

      return sendJSON(res, {
        success: true,
        product
      });
    }

    // ==================================================
    // PRODUCTS DELETE
    // ==================================================

    if (
      pathname.startsWith('/api/products/') &&
      method === 'DELETE'
    ) {
      const id =
        pathname.replace('/api/products/', '');

      const product =
        await db.deleteProduct(id);

      if (!product) {
        return sendJSON(res, {
          success: false,
          message: 'Product not found'
        }, 404);
      }

      return sendJSON(res, {
        success: true,
        message: 'Product deleted',
        product
      });
    }

    // ==================================================
    // CATEGORIES GET
    // ==================================================

    if (
      pathname === '/api/categories' &&
      method === 'GET'
    ) {
      const categories =
        await db.getCategories();

      return sendJSON(res, {
        success: true,
        categories
      });
    }

    // ==================================================
    // CATEGORIES POST
    // ==================================================

    if (
      pathname === '/api/categories' &&
      method === 'POST'
    ) {
      const body =
        await parseRequestBody(req);

      if (!body.name) {
        return sendJSON(res, {
          success: false,
          message: 'Category name required'
        }, 400);
      }

      const category =
        await db.addCategory(body);

      return sendJSON(res, {
        success: true,
        category
      }, 201);
    }

    // ==================================================
    // CATEGORIES DELETE
    // ==================================================

    if (
      pathname.startsWith('/api/categories/') &&
      method === 'DELETE'
    ) {
      const id =
        pathname.replace('/api/categories/', '');

      const category =
        await db.deleteCategory(id);

      if (!category) {
        return sendJSON(res, {
          success: false,
          message: 'Category not found'
        }, 404);
      }

      return sendJSON(res, {
        success: true,
        category
      });
    }

    // ==================================================
    // ORDERS GET
    // ==================================================

    if (
      pathname === '/api/orders' &&
      method === 'GET'
    ) {
      const customerId =
        urlObj.searchParams.get('customerId');

      let orders =
        await db.getOrders();

      if (customerId) {
        orders = orders.filter(order =>
          String(order.user_id) ===
          String(customerId)
        );
      }

      return sendJSON(res, {
        success: true,
        orders
      });
    }

    // ==================================================
    // ORDERS POST
    // ==================================================

    if (
      pathname === '/api/orders' &&
      method === 'POST'
    ) {
      try {
        const body =
          await parseRequestBody(req);

        if (
          !body.items ||
          !Array.isArray(body.items) ||
          body.items.length === 0
        ) {
          return sendJSON(res, {
            success: false,
            message: 'Cart items required'
          }, 400);
        }

        const order =
          await db.createOrder(body);

        return sendJSON(res, {
          success: true,
          message:
            'Order placed successfully',
          order
        }, 201);

      } catch (error) {
        console.error(
          'POST /api/orders error:',
          error
        );

        return sendJSON(res, {
          success: false,
          message:
            error.message ||
            'Failed to place order'
        }, 400);
      }
    }

    // ==================================================
    // ORDER STATUS
    // ==================================================

    if (
      pathname.match(
        /^\/api\/orders\/[^\/]+\/status$/
      ) &&
      method === 'PATCH'
    ) {
      const orderId =
        pathname.split('/')[3];

      const body =
        await parseRequestBody(req);

      if (!body.status) {
        return sendJSON(res, {
          success: false,
          message: 'Status required'
        }, 400);
      }

      const order =
        await db.updateOrderStatus(
          orderId,
          body.status
        );

      if (!order) {
        return sendJSON(res, {
          success: false,
          message: 'Order not found'
        }, 404);
      }

      return sendJSON(res, {
        success: true,
        order
      });
    }

    // ==================================================
    // NOTIFICATIONS GET
    // ==================================================

    if (
      pathname === '/api/notifications' &&
      method === 'GET'
    ) {
      const customerId =
        urlObj.searchParams.get(
          'customerId'
        );

      if (!customerId) {
        return sendJSON(res, {
          success: true,
          notifications: [],
          unreadCount: 0
        });
      }

      const notifications =
        await db.getNotifications(
          customerId
        );

      const unreadCount =
        notifications.filter(
          n => !n.is_read
        ).length;

      return sendJSON(res, {
        success: true,
        notifications,
        unreadCount
      });
    }

    // ==================================================
    // NOTIFICATIONS READ
    // ==================================================

    if (
      pathname ===
        '/api/notifications/read' &&
      method === 'POST'
    ) {
      const body =
        await parseRequestBody(req);

      if (!body.customerId) {
        return sendJSON(res, {
          success: false,
          message: 'Customer ID required'
        }, 400);
      }

      await db.markNotificationsRead(
        body.customerId
      );

      return sendJSON(res, {
        success: true,
        message:
          'Notifications marked as read'
      });
    }

    // ==================================================
    // ADMIN STATS
    // ==================================================

    if (
      pathname === '/api/admin/stats' &&
      method === 'GET'
    ) {
      const stats =
        await db.getAdminStats();

      return sendJSON(res, {
        success: true,
        stats
      });
    }

    // ==================================================
    // USERS GET
    // ==================================================

    if (
      pathname === '/api/users' &&
      method === 'GET'
    ) {
      const users =
        await db.getUsers();

      return sendJSON(res, {
        success: true,
        users
      });
    }

    // ==================================================
    // USERS POST
    // ==================================================

    if (
      pathname === '/api/users' &&
      method === 'POST'
    ) {
      const body =
        await parseRequestBody(req);

      if (
        !body.name ||
        !body.email
      ) {
        return sendJSON(res, {
          success: false,
          message:
            'Name and email are required'
        }, 400);
      }

      const result =
        await db.registerUser(body);

      if (!result.success) {
        return sendJSON(res, result, 400);
      }

      return sendJSON(res, {
        success: true,
        user: result.user
      }, 201);
    }

    // ==================================================
    // USERS DELETE
    // ==================================================

    if (
      pathname.startsWith('/api/users/') &&
      method === 'DELETE'
    ) {
      const id =
        pathname.replace('/api/users/', '');

      const user =
        await db.deleteUser(id);

      if (!user) {
        return sendJSON(res, {
          success: false,
          message: 'User not found'
        }, 404);
      }

      return sendJSON(res, {
        success: true,
        user
      });
    }

    // ==================================================
    // STATIC FILES
    // ==================================================

    let requestedPath =
      pathname === '/'
        ? 'index.html'
        : pathname;

    requestedPath =
      requestedPath.replace(/^\/+/, '');

    const publicRoot =
      path.resolve(PUBLIC_DIR);

    const filePath =
      path.resolve(
        PUBLIC_DIR,
        requestedPath
      );

    if (
      filePath !== publicRoot &&
      !filePath.startsWith(
        publicRoot + path.sep
      )
    ) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (
      fs.existsSync(filePath) &&
      fs.statSync(filePath).isFile()
    ) {
      const ext =
        path.extname(filePath);

      res.writeHead(200, {
        'Content-Type':
          MIME_TYPES[ext] ||
          'application/octet-stream'
      });

      return fs
        .createReadStream(filePath)
        .pipe(res);
    }

    // ==================================================
    // FALLBACK TO INDEX
    // ==================================================

    const indexPath =
      path.join(
        PUBLIC_DIR,
        'index.html'
      );

    if (
      fs.existsSync(indexPath) &&
      fs.statSync(indexPath).isFile()
    ) {
      res.writeHead(200, {
        'Content-Type':
          'text/html; charset=utf-8'
      });

      return fs
        .createReadStream(indexPath)
        .pipe(res);
    }

    res.writeHead(404, {
      'Content-Type':
        'text/plain'
    });

    res.end('404 Not Found');

  } catch (error) {

    console.error(
      'Server error:',
      error
    );

    return sendJSON(res, {
      success: false,
      message:
        'Internal Server Error',
      error: error.message
    }, 500);
  }
});

// ======================================================
// START SERVER
// ======================================================

server.listen(PORT, () => {
  console.log('');
  console.log(
    '=================================================='
  );
  console.log(
    '🚀 Smart Grocery System Server Running!'
  );
  console.log(
    `🌐 URL: http://localhost:${PORT}`
  );
  console.log(
    '=================================================='
  );
  console.log('');
});