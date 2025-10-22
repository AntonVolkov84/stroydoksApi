import pool from '../db.js'

export const saveBillOfQuantities = async (req, res) => {
  const { userId, title, rows } = req.body;
    if (!userId || !title || !rows) {
      console.log(userId, title, rows)
    return res.status(400).json({ message: "Неверные данные" });
  }
  try {
    await pool.query(
      `INSERT INTO saved_billofquantities  (userid, title, rows)
       VALUES ($1, $2, $3)`,
      [userId, title, JSON.stringify(rows)]
    );
    res.json({ message: "Ведомость объемов работ успешно сохранена" });
  } catch (err) {
    console.error("Ошибка записи ведомости объемов работ:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};
export const updateBillOfQuantities = async (req, res) => {
  const { billId, userId, title, rows } = req.body;
     if (!billId || !userId || !title || !rows) {
    return res.status(400).json({ message: "Неверные данные" });
  }
  try {
    const result = await pool.query(
      `UPDATE saved_billofquantities
       SET userId = $2, title = $3, rows = $4, updated_at = NOW()
       WHERE id = $1`,
      [billId, userId, title, JSON.stringify(rows)]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Ведомость объемов работ не найдена" });
    }
    res.json({ message: "Ведомость объемов работ успешно обновлена" });
  } catch (err) {
    console.error("Ошибка обновления ведомости объемов работ:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};
export const getSavedBillOfQuantities = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'userId обязателен' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM saved_billofquantities WHERE userId = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения сохранённых ведомостей по объемам работ:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
export const removeSavedBillOfQuantities = async (req, res) => {
  const { billId } = req.query;
  if (!billId) {
    return res.status(400).json({ message: 'billId обязателен' });
  }
  try {
     await pool.query(
      `DELETE FROM saved_billofquantities WHERE id = $1`,
      [Number(billId)]
    );
    res.json({ message: 'Ведомость объемов работ успешно удалена' });
  } catch (err) {
    console.error('Ошибка удаления ведомости объемов работ:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};