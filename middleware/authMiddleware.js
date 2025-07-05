import jwt from 'jsonwebtoken';
import pool from '../db.js'

const JWT_SECRET = 'refresh-secret'; 

const getUserFromDb = async (id) => {
  const result = await pool.query('SELECT id, email, username FROM users WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
};

export const authenticate = async(req, res, next) => {
  const token = req.cookies?.refreshToken;
    if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserFromDb(payload.id);
    if (!user) return res.sendStatus(401);
    req.user = user;
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};





