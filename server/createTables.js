require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function createTables() {
  try {
    await client.connect();

    const sql = fs.readFileSync('server/database.sql', 'utf8');

    await client.query(sql);

    console.log('Tables created successfully ✅');

    await client.end();

  } catch (error) {
    console.log(error.message);
    await client.end();
  }
}

createTables();
