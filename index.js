import express from "express";
import cors from "cors";
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
import * as authController from './controllers/authController.js'
import { authenticate } from './middleware/authMiddleware.js';
import cookieParser from 'cookie-parser';

const sslcertificate = '/etc/letsencrypt/live/api.stroydoks.ru/fullchain.pem';
const certificatekey = '/etc/letsencrypt/live/api.stroydoks.ru/privkey.pem';
const httpsPort = 3667
const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://app.stroydoks.ru'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

try{
  if (!fs.existsSync(certificatekey) || !fs.existsSync(sslcertificate)) {
    console.error("SSL files not found");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(certificatekey, 'utf8')
  const certificate = fs.readFileSync(sslcertificate, 'utf8')
  const credentials = {
    key: privateKey,
    cert: certificate
  }
  const httpsServer = https.createServer(credentials, app)
  httpsServer.listen(httpsPort, () => {console.log("Https сервер запущен")})
}catch(error){console.log("index.js", error.message)}


app.post('/stroydocs/register', authController.register);
app.post('/stroydocs/login', authController.login);
app.post('/stroydocs/refresh', authenticate,  authController.refresh);
app.post('/stroydocs/logout', authenticate,  authController.logout);
app.post('/stroydocs/me', authenticate,  authController.me);
app.post('/stroydocs/confirmmail', authController.mailConfirm);
app.post('/stroydocs/forgotpassword', authController.forgetPassword);
app.post('/stroydocs/changepassword', authController.changePassword);



