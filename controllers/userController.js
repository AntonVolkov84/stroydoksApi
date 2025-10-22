import pool from '../db.js'
export const getAllUsers = async(req, res) => {
  try {
      const result = await pool.query(
         `SELECT * FROM users ORDER BY email ASC`
      );
      res.status(200).json(result.rows);
    } catch (error) {
      console.error("Ошибка при получении пользователей:", error);
      res.status(500).json({ error: "Ошибка сервера при получении пользователей" });
    }
}
export const removeUser = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Не указан ID пользователя для удаления" });
  }
  try {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.status(200).json({ message: "Пользователь успешно удалён" });
  } catch (error) {
    console.error("Ошибка при удалении пользователя:", error);
    res.status(500).json({ error: "Ошибка сервера при удалении пользователя" });
  }
};
export const toggleUser = async (req, res) => {
  const { id, value } = req.body;
  if (typeof id !== "number" || typeof value !== "boolean") {
    return res.status(400).json({ error: "Некорректные данные: требуется id (number) и value (boolean)" });
  }
  try {
    await pool.query(
      `UPDATE users SET isadmin = $1 WHERE id = $2`,
      [value, id]
    );
    res.status(200).json({ message: "Права пользователя успешно изменены" });
  } catch (error) {
    console.error("Ошибка при изменении прав пользователя:", error);
    res.status(500).json({ error: "Ошибка сервера при изменении прав пользователя" });
  }
};
export const toggleUserUnlim = async (req, res) => {
  const { id, value } = req.body;
  if (typeof id !== "number" || typeof value !== "boolean") {
    return res.status(400).json({ error: "Некорректные данные: требуется id (number) и value (boolean)" });
  }
  try {
    await pool.query(
      `UPDATE users SET unlimited = $1 WHERE id = $2`,
      [value, id]
    );
    res.status(200).json({ message: "Биллинг пользователя успешно изменен" });
  } catch (error) {
    console.error("Ошибка при изменении прав пользователя:", error);
    res.status(500).json({ error: "Ошибка сервера при изменении биллинга пользователя" });
  }
};
export const getUserIdByEmail = async (req, res) => {
  try {
    const { email } = req.body; 
    if (!email) {
      return res.status(400).json({ error: "Не указан email" });
    }
    const result = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь с таким email не найден" });
    }
    res.status(200).json({ id: result.rows[0].id });
  } catch (error) {
    console.error("Ошибка при поиске пользователя по email:", error);
    res.status(500).json({ error: "Ошибка сервера при поиске пользователя" });
  }
};