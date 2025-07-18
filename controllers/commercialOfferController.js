import pool from '../db.js'

export const saveCommercialOffer = async (req, res) => {
  const { userId, title, rows, taxRate } = req.body;
  console.log(userId, title, rows, taxRate)
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