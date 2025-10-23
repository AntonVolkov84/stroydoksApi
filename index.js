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
import * as commercialOfferController from './controllers/commercialOfferController.js'
import * as referenceBookController from './controllers/referenceBookController.js'
import * as billOfQuantities from './controllers/BillOfQuantitiesController.js'
import * as mobileController from './controllers/mobileController.js'
import { authenticate } from './middleware/authMiddleware.js';
import {authenticateToken} from './middleware/authenticateToken.js'
import cookieParser from 'cookie-parser';
import {deleteImageFromCloudinary} from './controllers/cloudinaryController.js'

const sslcertificate = '/etc/letsencrypt/live/api.stroydoks.ru/fullchain.pem';
const certificatekey = '/etc/letsencrypt/live/api.stroydoks.ru/privkey.pem';
const httpsPort = 3667
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'https://api.stroydoks.ru', 'https://app.stroydoks.ru', 'https://stroydoks.ru'],
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
app.post('/calculators/create', authenticate, calculatorController.createCalculator);
app.get('/calculators', calculatorController.getAllCalculators);
app.post('/calculators/delete', authenticate, calculatorController.deleteCalculator);
app.post('/calculators/update', authenticate, calculatorController.updateCalculator);
app.post('/stroydocs/savecalc', authenticate, calculatorController.saveCalculation);
app.get('/stroydocs/getsavecalc', calculatorController.getSavedCalculations);
app.delete("/stroydocs/delsavedcalc", authenticate, calculatorController.removeSavedCalculation );
app.post('/stroydocs/savecomerc', authenticate, commercialOfferController.saveCommercialOffer);
app.get('/stroydocs/getsavecomerc', commercialOfferController.getSavedCommercialOffers);
app.delete("/stroydocs/delsavedcomerc", authenticate, commercialOfferController.removeSavedCommercialOffer );
app.put("/stroydocs/updatesavedcomerc", authenticate, commercialOfferController.updateCommercialOffer );
app.post('/stroydocs/savecomercsecondform', authenticate, commercialOfferController.saveCommercialOfferSecondForm);
app.post('/stroydocs/pendingcommercial', authenticate, commercialOfferController.savePendingCommercialOffer);
app.get('/stroydocs/getsavecomercsecondform', commercialOfferController.getSavedCommercialOfferSecondForm);
app.post('/referencebook/createre', authenticate, referenceBookController.addToReferenceData);
app.post('/referencebook/updateref', authenticate, referenceBookController.updateReferenceData);
app.delete('/referencebook/removeref', authenticate, referenceBookController.deleteReferenceData);
app.get('/referencebook/getalldata', referenceBookController.getAllReferenceData);
app.delete("/stroydocs/delsavedcomercsecondform", authenticate, commercialOfferController.removeSavedCommercialOfferSecondForm );
app.put("/stroydocs/updatesavedcomercsecondform", authenticate, commercialOfferController.updateCommercialOfferSecondForm);
app.get('/users', authenticate, userController.getAllUsers);
app.post('/users/remove', authenticate, userController.removeUser);
app.post('/users/toggleadmin', authenticate, userController.toggleUser);
app.post('/users/getuserid', authenticate, userController.getUserIdByEmail);
app.post('/users/toggleunlim', authenticate, userController.toggleUserUnlim);
app.post('/news/create', authenticate, newsController.createNews);
app.delete("/delete-image", deleteImageFromCloudinary);
app.delete("/news/delete", authenticate, newsController.deleteNew);
app.get("/news/getallnews", newsController.getAllNews);
app.put("/news/changenew/:id", authenticate, newsController.changeNew);
app.post('/stroydocs/savebillbook', authenticate, billOfQuantities.saveBillOfQuantities);
app.put('/stroydocs/updatesavedbillbook', authenticate, billOfQuantities.updateBillOfQuantities);
app.get('/stroydocs/getsavedbillbook', authenticate, billOfQuantities.getSavedBillOfQuantities);
app.delete("/stroydocs/delsavedbillbook", authenticate, billOfQuantities.removeSavedBillOfQuantities);

app.post("/mobile/register", mobileController.register)
app.post("/mobile/login", mobileController.login)
app.post("/mobile/refresh-token", mobileController.refreshAccessToken)
app.get("/mobile/me", mobileController.meMobile)

app.get("/mobile/objects", authenticateToken, mobileController.getObjects)
app.post("/mobile/objects", authenticateToken, mobileController.createObject)
app.delete("/mobile/objects/:id", authenticateToken, mobileController.deleteObject)
app.get("/mobile/pendingworks", authenticateToken, mobileController.getPendingWorks)
app.post("/mobile/pendingworks", authenticateToken, mobileController.addPendingWork)
app.put("/mobile/pendingworks/:workId", authenticateToken, mobileController.updatePendingWork)
app.delete("/mobile/pendingworks/:workId", authenticateToken, mobileController.deletePendingWork)
app.post("/mobile/sendworks", authenticateToken, mobileController.sendWorks);
app.put("/mobile/sendworks/assign-object", authenticateToken, mobileController.assignObjectToWork);
app.get("/mobile/recipients", authenticateToken, mobileController.getRecipients)
app.post("/mobile/recipients", authenticateToken, mobileController.addRecipient)
app.get("/mobile/sendworks/received", authenticateToken, mobileController.getReceivedWorks);
app.get("/mobile/sendworks", authenticateToken, mobileController.getSendWorks);
app.put("/mobile/sendworks/:id/status", authenticateToken, mobileController.updateStatus);
app.put("/mobile/sendworks/:id", authenticateToken, mobileController.updateSendWork);
app.get("/mobile/sendworks/finishedworks", authenticateToken, mobileController.getFinishedSendWorks);
app.post('/mobile/savebillbook', authenticateToken, billOfQuantities.saveBillOfQuantities);
app.post('/mobile/sendworks/export', authenticateToken, mobileController.exportWorks);
app.get("/mobile/sendworks/history", authenticateToken, mobileController.getSendWorksHistory);
app.post('/mobile/objects/:id/backup', authenticateToken, mobileController.backupObject);


process.on('unhandledRejection', (reason, promise) => {
  console.error('🧨 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

