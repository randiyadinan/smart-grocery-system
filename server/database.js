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


// ==================================================
// USERS
// ==================================================

async function getUsers() {
  const result = await query(`
    SELECT
      id,
      name,
      email,
      role,
      created_at
    FROM users
    ORDER BY id DESC
  `);

  return result.rows;
}


async function registerUser(user) {
  try {
    const existing = await query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [user.email]
    );

    if (existing.rows.length > 0) {
      return {
        success: false,
        message: 'Email already registered'
      };
    }

    const hashedPassword = await bcrypt.hash(
      user.password,
      10
    );

    const result = await query(`
      INSERT INTO users
        (
          name,
          email,
          password,
          role
        )
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        id,
        name,
        email,
        role,
        created_at
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
    console.error(
      'Register error:',
      error
    );

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
        `
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER($1)
          AND LOWER(role) = LOWER($2)
        `,
        [
          email,
          role
        ]
      );
    } else {
      result = await query(
        `
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER($1)
        `,
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

    if (!user.password) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    const passwordMatch =
      await bcrypt.compare(
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
    console.error(
      'Login error:',
      error
    );

    return {
      success: false,
      message: 'Login failed'
    };
  }
}


async function deleteUser(id) {
  const result = await query(
    `
    DELETE FROM users
    WHERE id = $1
    RETURNING
      id,
      name,
      email,
      role
    `,
    [id]
  );

  return result.rows[0] || null;
}


// ==================================================
// CATEGORIES
// ==================================================

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
    INSERT INTO categories
      (name)
    VALUES
      ($1)
    RETURNING *
  `, [
    category.name
  ]);

  return result.rows[0];
}


async function deleteCategory(id) {
  const result = await query(
    `
    DELETE FROM categories
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0] || null;
}


// ==================================================
// PRODUCTS
// ==================================================

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
      (
        name,
        description,
        price,
        stock,
        category_id,
        image
      )
    VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
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
    `
    DELETE FROM products
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0] || null;
}


// ==================================================
// ORDERS
// ==================================================

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
            'subtotal',
              (oi.quantity * oi.price)
          )
        )
        FILTER (
          WHERE oi.id IS NOT NULL
        ),
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

    timestamp:
      order.created_at,

    totalAmount:
      Number(order.total || 0),

    paymentMethod:
      order.payment_method,

    pickupPin:
      order.pickup_pin,

    items:
      order.items || []
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

    const items =
      Array.isArray(order.items)
        ? order.items
        : [];

    if (items.length === 0) {
      throw new Error(
        'Cart items required'
      );
    }


    // ----------------------------------------------
    // Verify products
    // ----------------------------------------------

    const verifiedItems = [];

    for (const item of items) {

      const productId =
        item.productId ??
        item.product_id ??
        item.id ??
        item.product?.id ??
        null;

      const quantity = Number(
        item.quantity ??
        item.qty ??
        1
      );

      if (!productId) {
        throw new Error(
          'Invalid product ID'
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid quantity for product ${productId}`
        );
      }


      // Lock product row
      const productResult =
        await client.query(
          `
          SELECT
            id,
            name,
            price,
            stock
          FROM products
          WHERE id = $1
          FOR UPDATE
          `,
          [productId]
        );


      if (
        productResult.rows.length === 0
      ) {
        throw new Error(
          `Product ${productId} not found`
        );
      }


      const product =
        productResult.rows[0];


      // Check stock
      if (
        Number(product.stock) < quantity
      ) {
        throw new Error(
          `Not enough stock for ${product.name}. Available: ${product.stock}`
        );
      }


      const price =
        Number(product.price);


      verifiedItems.push({
        productId:
          product.id,

        name:
          product.name,

        quantity,

        price
      });
    }


    // ----------------------------------------------
    // Calculate total
    // ----------------------------------------------

    const totalAmount =
      verifiedItems.reduce(
        (sum, item) => {
          return sum +
            (
              item.quantity *
              item.price
            );
        },
        0
      );


    // ----------------------------------------------
    // Generate pickup PIN
    // ----------------------------------------------

    const pickupPin =
      String(
        Math.floor(
          1000 +
          Math.random() * 9000
        )
      );


    // ----------------------------------------------
    // Create order
    // ----------------------------------------------

    const orderResult =
      await client.query(
        `
        INSERT INTO orders
          (
            user_id,
            total,
            status,
            payment_method,
            pickup_pin
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5
          )
        RETURNING *
        `,
        [
          userId,
          totalAmount,
          'Pending',
          paymentMethod,
          pickupPin
        ]
      );


    const newOrder =
      orderResult.rows[0];


    // ----------------------------------------------
    // Insert items + reduce stock
    // ----------------------------------------------

    for (const item of verifiedItems) {

      await client.query(
        `
        INSERT INTO order_items
          (
            order_id,
            product_id,
            quantity,
            price
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4
          )
        `,
        [
          newOrder.id,
          item.productId,
          item.quantity,
          item.price
        ]
      );


      const stockResult =
        await client.query(
          `
          UPDATE products
          SET stock =
            stock - $1

          WHERE id = $2
            AND stock >= $1

          RETURNING
            id,
            stock
          `,
          [
            item.quantity,
            item.productId
          ]
        );


      if (
        stockResult.rows.length === 0
      ) {
        throw new Error(
          `Stock update failed for product ${item.name}`
        );
      }
    }


    // ----------------------------------------------
    // Commit
    // ----------------------------------------------

    await client.query(
      'COMMIT'
    );


    return {
      ...newOrder,
      items: verifiedItems
    };

  } catch (error) {

    await client.query(
      'ROLLBACK'
    );

    console.error(
      'Create order error:',
      error
    );

    throw error;

  } finally {
    client.release();
  }
}


async function updateOrderStatus(
  id,
  status
) {
  const result = await query(`
    UPDATE orders
    SET status = $1
    WHERE id = $2
    RETURNING *
  `, [
    status,
    id
  ]);

  return result.rows[0] || null;
}


// ==================================================
// NOTIFICATIONS
// ==================================================

async function getNotifications(userId) {
  const result = await query(`
    SELECT *
    FROM notifications
    WHERE user_id = $1
    ORDER BY id DESC
  `, [
    userId
  ]);

  return result.rows;
}


async function markNotificationsRead(
  userId
) {
  await query(`
    UPDATE notifications
    SET is_read = true
    WHERE user_id = $1
  `, [
    userId
  ]);
}


// ==================================================
// ADMIN ANALYTICS
// ==================================================

async function getAdminStats() {
  try {

    // ----------------------------------------------
    // Total users
    // ----------------------------------------------

    const users = await query(`
      SELECT
        COUNT(*)::int AS count
      FROM users
    `);


    // ----------------------------------------------
    // Total customers
    // ----------------------------------------------

    const customers = await query(`
      SELECT
        COUNT(*)::int AS count
      FROM users
      WHERE LOWER(role) = 'customer'
    `);


    // ----------------------------------------------
    // Total products
    // ----------------------------------------------

    const products = await query(`
      SELECT
        COUNT(*)::int AS count
      FROM products
    `);


    // ----------------------------------------------
    // Total orders
    // ----------------------------------------------

    const orders = await query(`
      SELECT
        COUNT(*)::int AS count
      FROM orders
    `);


    // ----------------------------------------------
    // Completed orders
    // ----------------------------------------------

    const completedOrders =
      await query(`
        SELECT
          COUNT(*)::int AS count
        FROM orders
        WHERE LOWER(status) = 'completed'
      `);


    // ----------------------------------------------
    // Pending / active orders
    // ----------------------------------------------

    const pendingOrders =
      await query(`
        SELECT
          COUNT(*)::int AS count
        FROM orders

        WHERE LOWER(status) IN (
          'pending',
          'preparing',
          'ready for pickup'
        )
      `);


    // ----------------------------------------------
    // REQUIRES REORDER
    //
    // Any product with stock <= 5
    // is considered low stock.
    // ----------------------------------------------

    const lowStock =
      await query(`
        SELECT
          COUNT(*)::int AS count
        FROM products
        WHERE COALESCE(stock, 0) <= 5
      `);


    // ----------------------------------------------
    // Total completed revenue
    // ----------------------------------------------

    const revenue =
      await query(`
        SELECT
          COALESCE(
            SUM(total),
            0
          )::numeric AS total

        FROM orders

        WHERE LOWER(status) =
          'completed'
      `);


    // ----------------------------------------------
    // Last 7 days sales
    // ----------------------------------------------

    const salesByDay =
      await query(`
        SELECT

          DATE(created_at)
            AS date,

          TO_CHAR(
            created_at,
            'Dy'
          ) AS day,

          COALESCE(
            SUM(total),
            0
          )::numeric AS revenue,

          COUNT(*)::int
            AS orders

        FROM orders

        WHERE LOWER(status) =
          'completed'

          AND created_at >=
            CURRENT_DATE -
            INTERVAL '6 days'

        GROUP BY
          DATE(created_at),
          TO_CHAR(
            created_at,
            'Dy'
          )

        ORDER BY
          DATE(created_at)
      `);


    // ----------------------------------------------
    // Final response
    // ----------------------------------------------

    return {

      users:
        Number(
          users.rows[0].count
        ),

      customers:
        Number(
          customers.rows[0].count
        ),

      products:
        Number(
          products.rows[0].count
        ),

      orders:
        Number(
          orders.rows[0].count
        ),

      totalOrders:
        Number(
          orders.rows[0].count
        ),

      completedOrders:
        Number(
          completedOrders
            .rows[0]
            .count
        ),

      pendingOrders:
        Number(
          pendingOrders
            .rows[0]
            .count
        ),

      lowStockCount:
        Number(
          lowStock
            .rows[0]
            .count
        ),

      totalRevenue:
        Number(
          revenue
            .rows[0]
            .total
        ),

      revenue:
        Number(
          revenue
            .rows[0]
            .total
        ),

      salesByDay:
        salesByDay.rows.map(
          row => ({
            date:
              row.date,

            day:
              row.day,

            revenue:
              Number(
                row.revenue
              ),

            orders:
              Number(
                row.orders
              )
          })
        )
    };

  } catch (error) {

    console.error(
      'Admin analytics error:',
      error
    );

    throw error;
  }
}


// ==================================================
// EXPORTS
// ==================================================

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