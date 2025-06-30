import jwt from 'jsonwebtoken';

const JWT_SECRET = 'refresh-secret'; 

export const authenticate = (req, res, next) => {
  const token = req.cookies?.refreshToken;
    if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};





