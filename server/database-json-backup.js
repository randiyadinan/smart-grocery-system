require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = {

    async getProducts() {
        const result = await pool.query(
            "SELECT * FROM products ORDER BY id DESC"
        );
        return result.rows;
    },

    async addProduct(product) {
        const result = await pool.query(
            `INSERT INTO products(name, price, stock)
             VALUES($1,$2,$3)
             RETURNING *`,
            [
                product.name,
                product.price,
                product.stock
            ]
        );

        return result.rows[0];
    },


    async getUsers() {
        const result = await pool.query(
            "SELECT * FROM users"
        );

        return result.rows;
    },


    async createUser(user) {

        const result = await pool.query(
            `INSERT INTO users(name,email,password,role)
             VALUES($1,$2,$3,$4)
             RETURNING *`,
             [
                user.name,
                user.email,
                user.password,
                user.role || 'customer'
             ]
        );

        return result.rows[0];
    }

};
