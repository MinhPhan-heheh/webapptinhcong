require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  },
);

pool.connect()
  .then(() =>
    console.log(
      "✅ KẾT NỐI DATABASE THÀNH CÔNG! Port:",
      process.env.DB_PORT
    )
  )
  .catch((err) =>
    console.error("❌ LỖI KẾT NỐI:", err.message)
  );

module.exports = pool;