import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Resend } from "resend";
import crypto from 'crypto'
import axios from 'axios';
import pool from '../db.js'
const resend = new Resend(process.env.EMAIL_PASS);

const JWT_SECRET = 'access-secret';
const JWT_REFRESH_SECRET = 'refresh-secret';

const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { username, password, email, recaptchaToken } = req.body;
    if (!username || !password || !email) {
      return res.status(422).json({ message: 'Not enough data' });
    }
    if (!recaptchaToken) {
      return res.status(400).json({ message: "reCAPTCHA token missing" });
    }
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    if (
      !recaptchaResult ||
      !recaptchaResult.success ||
      recaptchaResult.score < 0.5 ||
      recaptchaResult.action !== "register"
    ) {
      return res.status(403).json({ message: "Failed reCAPTCHA verification" });
    }
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomUUID();

    const insertQuery = `
      INSERT INTO users 
        (username, password, email, emailConfirmToken, emailConfirmed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, emailConfirmed;
    `;
    const values = [username, hashed, email, emailToken, false];
    const result = await pool.query(insertQuery, values);

    const user = result.rows[0];

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await sendConfirmationEmail(email, emailToken);

    res.status(201).json({ accessToken });

  } catch (error) {
    console.log("register error:", error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(422).json({ message: 'Username and password required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
export const refresh = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.sendStatus(401);
  try {
      const payload = jwt.verify(token, JWT_REFRESH_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [payload.id]);
    if (result.rows.length === 0) {
      return res.sendStatus(403);
    }
    const user = result.rows[0];
    const { accessToken } = generateTokens(user);
    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.sendStatus(403);
  }
};
export const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};
export const me = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, emailconfirmed FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.sendStatus(404);
    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      emailConfirmed: user.emailconfirmed, 
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.sendStatus(500);
  }
};
export const mailConfirm = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Токен не передан' });
    const result = await pool.query(
      'SELECT id FROM users WHERE emailconfirmtoken = $1',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Неверный токен' });
    }
    const userId = result.rows[0].id;
    await pool.query(
      'UPDATE users SET emailconfirmed = true, emailconfirmtoken = NULL WHERE id = $1',
      [userId]
    );
    res.status(200).json({ success: true, message: 'Почта подтверждена' });
  } catch (error) {
    console.log("mailConfirm", error.message);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};

export const findUserByToken = async (token) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE emailconfirmtoken = $1',
    [token]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
};
export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(422).json({ message: 'Not enough data' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(200).json({ message: "If this email exists, a reset link has been sent." });
    }
    const user = result.rows[0];
    const emailToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60);
    await pool.query(
      `UPDATE users SET forgotpasswordtoken = $1, forgotpasswordtokenexpires = $2 WHERE id = $3`,
      [emailToken, expires, user.id]
    );
    await sendForgotPasswordEmail(email, emailToken);
    res.status(200).json({ message: "If this email exists, a reset link has been sent." });
  } catch (error) {
    console.log("forgetPassword error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Токен и пароль обязательны' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Пароль должен быть минимум 6 символов" });
    }
    const result = await pool.query(
      'SELECT * FROM users WHERE forgotpasswordtoken = $1',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Неверный токен' });
    }
    const user = result.rows[0];
    if (!user.forgotpasswordtokenexpires || new Date(user.forgotpasswordtokenexpires) < new Date()) {
      return res.status(400).json({ success: false, message: "Токен истёк" });
    }
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE users
       SET password = $1,
           forgotpasswordtoken = NULL,
           forgotpasswordtokenexpires = NULL
       WHERE id = $2`,
      [hashed, user.id]
    );
    res.status(200).json({ success: true, message: 'Пароль изменен!' });
  } catch (error) {
    console.log("changePassword error:", error.message);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};

const verifyRecaptcha = async(token) => {
  const url = `https://www.google.com/recaptcha/api/siteverify`;
  try {
    const response = await axios.post(
      url,
      new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data; 
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return null;
  }
}
export async function sendConfirmationEmail(to, token) {
  const confirmLink = `https://app.stroydoks.ru/confirm-email?token=${token}`;

  try {
    const data = await resend.emails.send({
      from: "Stroydoks <no-reply@stroydoks.ru>",
      to,
      subject: "Подтверждение регистрации в Stroydoks",
      html: `<p>Здравствуйте!</p>
             <p>Для подтверждения регистрации перейдите по ссылке:</p>
             <a href="${confirmLink}">${confirmLink}</a>`,
    });
    console.log("Письмо подтверждения отправлено:", data);
  } catch (error) {
    console.error("❌ Ошибка отправки email через Resend:", error);
    throw error;
  }
}
export async function sendForgotPasswordEmail(to, token) {
  const resetLink = `https://app.stroydoks.ru/changepassword?token=${token}`;
  try {
    const data = await resend.emails.send({
      from: "Stroydoks <support@stroydoks.ru>",
      to,
      subject: "Сброс пароля в Stroydoks",
      html: `<p>Здравствуйте!</p>
             <p>Для сброса пароля перейдите по ссылке:</p>
             <a href="${resetLink}">${resetLink}</a>`,
    });
    console.log("Письмо для сброса пароля отправлено:", data);
  } catch (error) {
    console.error("❌ Ошибка отправки email для сброса пароля через Resend:", error);
    throw error;
  }
}