import express from "express";
import cors from "cors";
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
import * as authController from './controllers/authController.js'
import * as calculatorController from './controllers/calculatorController.js'
import * as userController from './controllers/userController.js'
import * as newsController from './controllers/newsController.js'
import { authenticate } from './middleware/authMiddleware.js';
import cookieParser from 'cookie-parser';
import {deleteImageFromCloudinary} from './controllers/cloudinaryController.js'

const sslcertificate = '/etc/letsencrypt/live/api.stroydoks.ru/fullchain.pem';
const certificatekey = '/etc/letsencrypt/live/api.stroydoks.ru/privkey.pem';
const httpsPort = 3667
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'https://api.stroydoks.ru', 'https://app.stroydoks.ru'],
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
app.post('/stroydocs/changepassword', authenticate, authController.changePassword);
app.post('/calculators/create', authenticate, calculatorController.createCalculator);
app.get('/calculators', authenticate, calculatorController.getAllCalculators);
app.post('/calculators/delete', authenticate, calculatorController.deleteCalculator);
app.post('/calculators/update', authenticate, calculatorController.updateCalculator);
app.get('/users', authenticate, userController.getAllUsers);
app.post('/users/remove', authenticate, userController.removeUser);
app.post('/users/toggleadmin', authenticate, userController.toggleUser);
app.post('/news/create', authenticate, newsController.createNews);
app.delete("/delete-image", deleteImageFromCloudinary);
app.delete("/news/delete", newsController.deleteNew);
app.get("/news/getallnews", newsController.getAllNews);
app.put("/news/changenew/:id", newsController.changeNew);

process.on('unhandledRejection', (reason, promise) => {
  console.error('🧨 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

