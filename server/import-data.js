require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const data = require('./data/db.json');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Starting import...');

    // Maps old JSON IDs → new PostgreSQL integer IDs
    const userMap = new Map();
    const categoryMap = new Map();
    const productMap = new Map();
    const orderMap = new Map();

    // ==================== USERS ====================

    for (const user of data.users || []) {
      const password = user.password || 'password123';

      const hashedPassword =
        password.startsWith('$2')
          ? password
          : await bcrypt.hash(password, 10);

      const result = await client.query(`
        INSERT INTO users
          (name, email, password, role, created_at)
        VALUES
          ($1, $2, $3, $4, COALESCE($5, NOW()))
        RETURNING id
      `, [
        user.name,
        user.email,
        hashedPassword,
        user.role || 'customer',
        user.created_at || null
      ]);

      userMap.set(String(user.id), result.rows[0].id);
    }

    console.log(`Users imported: ${data.users?.length || 0}`);

    // ==================== CATEGORIES ====================

    for (const category of data.categories || []) {
      const result = await client.query(`
        INSERT INTO categories
          (name)
        VALUES
          ($1)
        RETURNING id
      `, [
        category.name
      ]);

      categoryMap.set(String(category.id), result.rows[0].id);
    }

    console.log(`Categories imported: ${data.categories?.length || 0}`);

    // ==================== PRODUCTS ====================

    for (const product of data.products || []) {
      const oldCategoryId =
        product.category_id || product.categoryId || null;

      const newCategoryId =
        oldCategoryId !== null
          ? categoryMap.get(String(oldCategoryId)) || null
          : null;

      const result = await client.query(`
        INSERT INTO products
          (name, description, price, stock, image, category_id)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        product.name,
        product.description || '',
        product.price || 0,
        product.stock || 0,
        product.image || null,
        newCategoryId
      ]);

      productMap.set(String(product.id), result.rows[0].id);
    }

    console.log(`Products imported: ${data.products?.length || 0}`);

    // ==================== ORDERS ====================

    for (const order of data.orders || []) {
      const oldUserId =
        order.user_id || order.customerId || null;

      const newUserId =
        oldUserId !== null
          ? userMap.get(String(oldUserId)) || null
          : null;

      const result = await client.query(`
        INSERT INTO orders
          (user_id, total, status, payment_method)
        VALUES
          ($1, $2, $3, $4)
        RETURNING id
      `, [
        newUserId,
        order.total || 0,
        order.status || 'pending',
        order.payment_method || 'cash'
      ]);

      orderMap.set(String(order.id), result.rows[0].id);

      // Import order items if they exist inside the order
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const oldProductId =
            item.product_id || item.productId;

          const newProductId =
            productMap.get(String(oldProductId));

          if (!newProductId) {
            console.log(
              `Skipping order item: product ${oldProductId} not found`
            );
            continue;
          }

          await client.query(`
            INSERT INTO order_items
              (order_id, product_id, quantity, price)
            VALUES
              ($1, $2, $3, $4)
          `, [
            result.rows[0].id,
            newProductId,
            item.quantity || 1,
            item.price || 0
          ]);
        }
      }
    }

    console.log(`Orders imported: ${data.orders?.length || 0}`);

    await client.query('COMMIT');

    console.log('');
    console.log('================================');
    console.log('Import completed successfully! ✅');
    console.log('================================');

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Import failed:', error);

  } finally {
    client.release();
    await pool.end();
  }
}

importData();
