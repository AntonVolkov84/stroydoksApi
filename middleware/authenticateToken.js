import jwt from 'jsonwebtoken';
import { pool } from "../db.js"; 
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.sendStatus(403);
    }

    const userId = decoded.id;
    if (!userId) return res.sendStatus(403);

    const userRes = await pool.query(
      'SELECT id, role, email FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rowCount === 0) return res.sendStatus(403);

    req.user = {
      id: userRes.rows[0].id,
      role: userRes.rows[0].role,
      email: userRes.rows[0].email
    };

    next();
  } catch (err) {
    console.error('authenticateToken error', err);
    res.sendStatus(500);
  }
};
