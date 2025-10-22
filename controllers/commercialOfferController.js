import pool from '../db.js'
import {sendEmailUnregisteredUser} from './authController.js'

export const saveCommercialOffer = async (req, res) => {
  const { userId, title, rows, taxRate } = req.body;
     if (!userId || !title || !rows || !taxRate) {
    return res.status(400).json({ message: "Неверные данные" });
  }
  try {
    await pool.query(
      `INSERT INTO saved_commercialoffer (userId, title, rows, taxRate)
       VALUES ($1, $2, $3, $4)`,
      [userId, title, JSON.stringify(rows), taxRate]
    );
    res.json({ message: "Сохранено успешно коммерческое предложение" });
  } catch (err) {
    console.error("Ошибка записи коммерческого предложения:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};
export const updateCommercialOffer = async (req, res) => {
  const { offerId, userId, title, rows, taxRate } = req.body;
     if (!offerId || !userId || !title || !rows || !taxRate) {
    return res.status(400).json({ message: "Неверные данные" });
  }
  try {
    const result = await pool.query(
      `UPDATE saved_commercialoffer
       SET userId = $2, title = $3, rows = $4, taxRate = $5, created_at = NOW()
       WHERE id = $1`,
      [offerId, userId, title, JSON.stringify(rows), taxRate]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Коммерческое предложение не найдено" });
    }
    res.json({ message: "Коммерческое предложение успешно обновлено" });
  } catch (err) {
    console.error("Ошибка обновления коммерческого предложения:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};
export const getSavedCommercialOffers = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'userId обязателен' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM saved_commercialoffer WHERE userId = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения сохранённых коммерческих предложений:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
export const removeSavedCommercialOffer = async (req, res) => {
  const { savedComercId } = req.query;
  if (!savedComercId) {
    return res.status(400).json({ message: 'userId обязателен' });
  }
  try {
     await pool.query(
      `DELETE FROM saved_commercialoffer WHERE id = $1`,
      [Number(savedComercId)]
    );
    res.json({ message: 'Коммерческое предложение успешно удалено' });
  } catch (err) {
    console.error('Ошибка удаления сохраненного коммерческого предложения:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
export const saveCommercialOfferSecondForm = async (req, res) => {
  const { userId, title, rows, taxRate } = req.body;
       if (!userId || !title || !rows || !taxRate) {
    return res.status(400).json({ message: "Неверные данные" });
  }
  try {
    await pool.query(
      `INSERT INTO saved_commercialofferformone  (userId, title, rows, taxRate)
       VALUES ($1, $2, $3, $4)`,
      [userId, title, JSON.stringify(rows), taxRate]
    );
    res.json({ message: "Сохранено успешно коммерческое предложение формы 1" });
  } catch (err) {
    console.error("Ошибка записи коммерческого предложения:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};
export const updateCommercialOfferSecondForm = async (req, res) => {
  const { offerId, userId, title, rows, taxRate } = req.body;
     if (!offerId || !userId || !title || !rows || !taxRate) {
    return res.status(400).json({ message: "Неверные данные" });
  }
  try {
    const result = await pool.query(
      `UPDATE saved_commercialofferformone
       SET userId = $2, title = $3, rows = $4, taxRate = $5, created_at = NOW()
       WHERE id = $1`,
      [offerId, userId, title, JSON.stringify(rows), taxRate]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Коммерческое предложение не найдено" });
    }
    res.json({ message: "Коммерческое предложение формы 1 успешно обновлено" });
  } catch (err) {
    console.error("Ошибка обновления коммерческого предложения:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};
export const getSavedCommercialOfferSecondForm = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'userId обязателен' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM saved_commercialofferformone WHERE userId = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения сохранённых коммерческих предложений формы 1:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
export const removeSavedCommercialOfferSecondForm = async (req, res) => {
  const { savedComercId } = req.query;
  if (!savedComercId) {
    return res.status(400).json({ message: 'userId обязателен' });
  }
  try {
     await pool.query(
      `DELETE FROM saved_commercialofferformone WHERE id = $1`,
      [Number(savedComercId)]
    );
    res.json({ message: 'Коммерческое предложение формы 1 успешно удалено' });
  } catch (err) {
    console.error('Ошибка удаления сохраненного коммерческого предложения формы 1:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
export const savePendingCommercialOffer = async (req, res) => {
  const { email, title, rows, taxRate, type, receiver, sender } = req.body;
  console.log(email, title, rows, taxRate, type, receiver, sender)
       if (!email || !title || !rows || !taxRate || !type || !receiver || !sender) {
    return res.status(400).json({ message: "Неверные или неполные данные для временно сохраненных документов" });
  }
  try {
    await pool.query(
      `INSERT INTO saved_pendingcommercialoffer  (email, title, rows, taxRate, type)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, title, JSON.stringify(rows), taxRate, type]
    );
    await sendEmailUnregisteredUser(receiver, sender)
    res.json({ message: "Сохранение успешно во временную таблицу" });
  } catch (err) {
    console.error("Ошибка записи документа во временное хранилище", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};
