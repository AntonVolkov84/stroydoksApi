import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { Resend } from "resend";
import crypto from 'crypto'
import axios from 'axios';
import pool from '../db'
const USERS_FILE = path.resolve('users.json');
const resend = new Resend(process.env.EMAIL_PASS);
const readUsers = async () => {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (e) {
    console.error("readUsers error:", e.message);
    return [];
  }
};
const writeUsers = async (users) => {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error("writeUsers error:", e.message);
  }
};
const JWT_SECRET = 'access-secret';
const JWT_REFRESH_SECRET = 'refresh-secret';

const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try{
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
  const users = await readUsers();
  const existing = users.find(u => u.username === username || u.email === email);
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const emailToken = crypto.randomUUID();
  const user = { 
    id: Date.now(), 
    username, 
    password: hashed, 
    emailConfirmToken: emailToken, 
    email,
    emailConfirmed: false, 
     };
  users.push(user);
  const { accessToken, refreshToken } = generateTokens(user);
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'none',  
    secure: true,      
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
  await sendConfirmationEmail(email, emailToken)
  await writeUsers(users);
  res.status(201).json({ accessToken });
  
}catch(error){console.log("register", error.message)}}

export const login = async (req, res) => {
  const { username, password } = req.body;
   const users = await readUsers();
  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
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
};

export const refresh = async(req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.sendStatus(401);
  try {
    const users = await readUsers();
    const payload = jwt.verify(token, JWT_REFRESH_SECRET);
    const user = users.find(u => u.id === payload.id);
    if (!user) return res.sendStatus(403);
    const { accessToken } = generateTokens(user);
    res.json({ accessToken });
  } catch {
    res.sendStatus(403);
  }
};

export const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

export const me = async(req, res) => {
  const users = await readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.sendStatus(404);
  res.json({ id: user.id, username: user.username, email: user.email, emailConfirmed: user.emailConfirmed });
};

export const mailConfirm = async (req, res) => {
  try{
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Токен не передан' });
  const data = await fs.readFile(USERS_FILE, 'utf-8');
  const users = JSON.parse(data);
  const userIndex = users.findIndex(user => user.emailConfirmToken === token);
  if (userIndex === -1) {
   return res.status(400).json({ success: false, message: 'Неверный токен' });
  }
  users[userIndex].emailConfirmed = true;
  delete users[userIndex].emailConfirmToken;
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  res.status(200).json({ success: true, message: 'Почта подтверждена' })
  }catch(error){
  console.log("mailConfirm", error.message)
  res.status(500).json({ success: false, message: 'Ошибка сервера' });
}
};

export const findUserByToken = async (token) => {
  const data = await fs.promises.readFile(USERS_FILE, 'utf-8');
  const users = JSON.parse(data);

  return users.find(user => user.emailConfirmToken === token);
};
export const forgetPassword = async (req, res) => {
  try{
  const { email } = req.body;
  if (!email) {
    return res.status(422).json({ message: 'Not enough data' });
  }
  const users = await readUsers();
  const userIndex = users.findIndex(user => user.email === email);
   if (userIndex === -1) {
      return res.status(200).json({ message: "If this email exists, a reset link has been sent." });
    }
  
  const emailToken = crypto.randomUUID();
  const expires = Date.now() + 1000 * 60 * 60;
  users[userIndex] = {
      ...users[userIndex],
      forgotPasswordToken: emailToken,
      forgotPasswordTokenExpires: expires,
    };
  await sendForgotPasswordEmail(email, emailToken)
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  res.status(200).json({ emailToken });
}catch(error){console.log("register", error.message)}}

export const changePassword = async (req, res) => {
  try{
  const { token, password } = req.body;
  if (!token) return res.status(400).json({ error: 'Токен и пароль обязательны' });
  const data = await fs.readFile(USERS_FILE, 'utf-8');
  const users = JSON.parse(data);
  const userIndex = users.findIndex(user => user.forgotPasswordToken === token);
  if (userIndex === -1) {
   return res.status(400).json({ success: false, message: 'Неверный токен' });
  }
  const user = users[userIndex];
  if (!user.forgotPasswordTokenExpires || user.forgotPasswordTokenExpires < Date.now()) {
      return res.status(400).json({ success: false, message: "Токен истёк" });
    }
  if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Пароль должен быть минимум 6 символов" });
    }
  const hashed = await bcrypt.hash(password, 10);
  users[userIndex].password = hashed;
  delete users[userIndex].forgotPasswordToken;
  delete users[userIndex].forgotPasswordTokenExpires;
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  res.status(200).json({ success: true, message: 'Пароль изменен!' })
  }catch(error){
  console.log("mailConfirm", error.message)
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