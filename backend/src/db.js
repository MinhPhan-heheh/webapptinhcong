// require("dotenv").config();

// const { Pool } = require("pg");

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,

//   },
// );

// pool.connect()
//   .then(() =>
//     console.log(
//       "✅ KẾT NỐI DATABASE THÀNH CÔNG! Port:",
//       process.env.DB_PORT
//     )
//   )
//   .catch((err) =>
//     console.error("❌ LỖI KẾT NỐI:", err.message)
//   );

// module.exports = pool;


require("dotenv").config();

const { Pool } = require("pg");

// Nếu deploy Render -> dùng DATABASE_URL
// Nếu chạy local -> dùng localhost
const isRender = process.env.RENDER === "true";

const pool = new Pool(
  isRender
    ? {
        connectionString: process.env.DATABASE_URL,

        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      }
);

pool
  .connect()
  .then(() => {
    console.log("✅ DATABASE CONNECTED");
  })
  .catch((err) => {
    console.log("❌ DATABASE ERROR:", err.message);
  });

module.exports = pool;