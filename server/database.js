require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

// ==================== USERS ====================

async function getUsers() {
  const result = await query(`
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY id DESC
  `);

  return result.rows;
}

async function registerUser(user) {
  try {
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [user.email]
    );

    if (existing.rows.length > 0) {
      return {
        success: false,
        message: 'Email already registered'
      };
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const result = await query(`
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at
    `, [
      user.name,
      user.email,
      hashedPassword,
      user.role || 'customer'
    ]);

    return {
      success: true,
      user: result.rows[0]
    };

  } catch (error) {
    console.error('Register error:', error);
    return {
      success: false,
      message: 'Registration failed'
    };
  }
}

async function authenticate(email, password, role) {
  try {
    let result;

    if (role) {
      result = await query(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        [email, role]
      );
    } else {
      result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
    }

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

  } catch (error) {
    console.error('Login error:', error);

    return {
      success: false,
      message: 'Login failed'
    };
  }
}

async function deleteUser(id) {
  const result = await query(
    'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role',
    [id]
  );

  return result.rows[0] || null;
}

// ==================== CATEGORIES ====================

async function getCategories() {
  const result = await query(`
    SELECT *
    FROM categories
    ORDER BY id
  `);

  return result.rows;
}

async function addCategory(category) {
  const result = await query(`
    INSERT INTO categories (name)
    VALUES ($1)
    RETURNING *
  `, [category.name]);

  return result.rows[0];
}

async function deleteCategory(id) {
  const result = await query(
    'DELETE FROM categories WHERE id = $1 RETURNING *',
    [id]
  );

  return result.rows[0] || null;
}

// ==================== PRODUCTS ====================

async function getProducts() {
  const result = await query(`
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      p.stock,
      p.image,
      p.category_id,
      c.name AS category
    FROM products p
    LEFT JOIN categories c
      ON p.category_id = c.id
    ORDER BY p.id DESC
  `);

  return result.rows;
}

async function addProduct(product) {
  const result = await query(`
    INSERT INTO products
      (name, description, price, stock, category_id, image)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    product.name,
    product.description || '',
    product.price,
    product.stock,
    product.category_id || null,
    product.image || null
  ]);

  return result.rows[0];
}

async function updateProduct(id, product) {
  const result = await query(`
    UPDATE products
    SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      price = COALESCE($3, price),
      stock = COALESCE($4, stock),
      category_id = COALESCE($5, category_id),
      image = COALESCE($6, image)
    WHERE id = $7
    RETURNING *
  `, [
    product.name,
    product.description,
    product.price,
    product.stock,
    product.category_id,
    product.image,
    id
  ]);

  return result.rows[0] || null;
}

async function deleteProduct(id) {
  const result = await query(
    'DELETE FROM products WHERE id = $1 RETURNING *',
    [id]
  );

  return result.rows[0] || null;
}

// ==================== ORDERS ====================

async function getOrders() {
  const result = await query(`
    SELECT
      o.id,
      o.user_id,
      o.total,
      o.status,
      o.payment_method,
      o.pickup_pin,
      o.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'productId', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'name', p.name,
            'subtotal', (oi.quantity * oi.price)
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi
      ON oi.order_id = o.id
    LEFT JOIN products p
      ON p.id = oi.product_id
    GROUP BY
      o.id,
      o.user_id,
      o.total,
      o.status,
      o.payment_method,
      o.pickup_pin,
      o.created_at
    ORDER BY o.id DESC
  `);

  return result.rows.map(order => ({
    ...order,
    timestamp: order.created_at,
    totalAmount: Number(order.total || 0),
    paymentMethod: order.payment_method,
    pickupPin: order.pickup_pin,
    items: order.items || []
  }));
}


async function createOrder(order) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const paymentMethod =
      order.paymentMethod ||
      order.payment_method ||
      'cash';

    const userId =
      order.customerId ||
      order.customer_id ||
      order.user_id ||
      null;

    const items = Array.isArray(order.items) ? order.items : [];

    // Calculate the total from the order items.
    const totalAmount = items.reduce((sum, item) => {
      const quantity = Number(
        item.quantity ?? item.qty ?? 1
      );

      const price = Number(
        item.price ??
        item.unitPrice ??
        item.unit_price ??
        0
      );

      return sum + (quantity * price);
    }, 0);

    const pickupPin = String(
      Math.floor(1000 + Math.random() * 9000)
    );

    const orderResult = await client.query(`
      INSERT INTO orders
        (user_id, total, status, payment_method, pickup_pin)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      userId,
      totalAmount,
      'pending',
      paymentMethod,
      pickupPin
    ]);

    const newOrder = orderResult.rows[0];

    for (const item of items) {
      const productId =
        item.productId ??
        item.product_id ??
        item.id ??
        item.product?.id ??
        null;

      const quantity = Number(
        item.quantity ?? item.qty ?? 1
      );

      const price = Number(
        item.price ??
        item.unitPrice ??
        item.unit_price ??
        0
      );

      if (!productId) {
        throw new Error(
          `Invalid product ID in order item: ${JSON.stringify(item)}`
        );
      }

      await client.query(`
        INSERT INTO order_items
          (order_id, product_id, quantity, price)
        VALUES
          ($1, $2, $3, $4)
      `, [
        newOrder.id,
        productId,
        quantity,
        price
      ]);
    }

    await client.query('COMMIT');

    return {
      ...newOrder,
      timestamp: newOrder.created_at,
      totalAmount: Number(newOrder.total || 0),
      paymentMethod: newOrder.payment_method,
      pickupPin: newOrder.pickup_pin
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    throw error;

  } finally {
    client.release();
  }
}

async function updateOrderStatus(id, status) {
  const result = await query(`
    UPDATE orders
    SET status = $1
    WHERE id = $2
    RETURNING *
  `, [status, id]);

  return result.rows[0] || null;
}

// ==================== NOTIFICATIONS ====================

async function getNotifications(userId) {
  const result = await query(`
    SELECT *
    FROM notifications
    WHERE user_id = $1
    ORDER BY id DESC
  `, [userId]);

  return result.rows;
}

async function markNotificationsRead(userId) {
  await query(`
    UPDATE notifications
    SET is_read = true
    WHERE user_id = $1
  `, [userId]);
}

// ==================== ADMIN ====================
async function getAdminStats() {
  const users = await query(
    'SELECT COUNT(*) FROM users'
  );

  const products = await query(
    'SELECT COUNT(*) FROM products'
  );

  const orders = await query(
    'SELECT COUNT(*) FROM orders'
  );

  const completedOrders = await query(`
    SELECT COUNT(*) FROM orders
    WHERE LOWER(status) = 'completed'
  `);

  const pendingOrders = await query(`
    SELECT COUNT(*) FROM orders
    WHERE LOWER(status) IN (
      'pending',
      'preparing',
      'ready for pickup'
    )
  `);

  const lowStock = await query(`
    SELECT COUNT(*) FROM products
    WHERE stock <= 5
  `);

  const revenue = await query(`
    SELECT COALESCE(SUM(total), 0) AS total
    FROM orders
    WHERE LOWER(status) = 'completed'
  `);

  const activeCustomers = await query(`
    SELECT COUNT(*) FROM users
    WHERE LOWER(role) = 'customer'
  `);

  const salesByDay = await query(`
    SELECT
      TO_CHAR(created_at, 'Dy') AS day,
      COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE LOWER(status) = 'completed'
      AND created_at >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY TO_CHAR(created_at, 'Dy'), DATE(created_at)
    ORDER BY DATE(created_at)
  `);

  return {
    users: Number(users.rows[0].count),
    products: Number(products.rows[0].count),

    orders: Number(orders.rows[0].count),
    totalOrders: Number(orders.rows[0].count),

    completedOrders: Number(
      completedOrders.rows[0].count
    ),

    pendingOrdersCount: Number(
      pendingOrders.rows[0].count
    ),

    lowStockCount: Number(
      lowStock.rows[0].count
    ),

    activeCustomers: Number(
      activeCustomers.rows[0].count
    ),

    totalRevenue: Number(
      revenue.rows[0].total
    ),

    salesByDay: salesByDay.rows.map(row => ({
      day: row.day,
      revenue: Number(row.revenue)
    }))
  };
}
module.exports = {
  pool,
  query,

  getUsers,
  registerUser,
  authenticate,
  deleteUser,

  getCategories,
  addCategory,
  deleteCategory,

  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,

  getOrders,
  createOrder,
  updateOrderStatus,

  getNotifications,
  markNotificationsRead,

  getAdminStats
};
