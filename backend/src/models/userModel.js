const pool = require('../config/db');

const UserModel = {
  findByEmail: (email) =>
    pool.query('SELECT * FROM users WHERE email = $1', [email]),

  findById: (id) =>
    pool.query(
      'SELECT id, first_name, last_name, email, phone, role, created_at FROM users WHERE id = $1',
      [id]
    ),

  create: ({ first_name, last_name, email, phone, password_hash }) =>
    pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, first_name, last_name, email, role`,
      [first_name, last_name, email, phone || null, password_hash]
    ),
};

module.exports = UserModel;