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
       `SELECT * FROM news ORDER BY updated_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении новостей:", error);
    res.status(500).json({ error: "Ошибка сервера при получении новостей" });
  }
};
export const deleteNew = async(req, res) => {
  const id = req.query.id;
  try{
    const result = await pool.query("DELETE FROM news WHERE id = $1", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Новость не найдена" });
    }
    res.status(200).json({ message: "Новость успешно удалена" });
  }catch(error){console.log("Ошибка при удалении новости:", error)}
}
export const changeNew = async(req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, text, imageUrl, imagePublicId } = req.body;
  if (!id || !title || !text) {
    return res.status(400).json({ error: "ID, заголовок и текст обязательны" });
  }

  try {
    const query = `
      UPDATE news
      SET title = $1,
          text = $2,
          imageurl = $3,
          imagepublicid = $4,
          updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;
    const values = [title, text, imageUrl || null, imagePublicId || null, id];
    const result = await pool.query(query, values);
    console.log(result)
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Новость не найдена" });
    }

    res.status(200).json({ message: "Новость успешно обновлена", news: result.rows[0] });
  } catch (error) {
    console.error("Ошибка при обновлении новости:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
