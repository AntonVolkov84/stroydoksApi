import pool from '../db.js'
export const createNews = async (req, res) => {
  const { title, text, imageUrl, imagePublicId } = req.body;
  const userEmail = req.user.email
  if (!title || !text || !userEmail) {
  return res.status(400).json({ message: "Отсутствуют обязательные поля" });
}
  const forbiddenTagPattern = /<(script|iframe|object|embed|link|style)[\s>]/gi;
  if (forbiddenTagPattern.test(title) || forbiddenTagPattern.test(text)) {
    return res.status(400).json({ message: "Содержимое содержит запрещённые HTML-теги" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO news (title, text, imageUrl, author_email, imagePublicId, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       RETURNING *`,
      [title, text, imageUrl, userEmail, imagePublicId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Ошибка сохранения новости:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
}
 export const getAllNews = async (req, res) => {
  try {
    const result = await pool.query(
       `SELECT * FROM news ORDER BY created_at DESC`
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении новостей:", error);
    res.status(500).json({ error: "Ошибка сервера при получении новостей" });
  }
};