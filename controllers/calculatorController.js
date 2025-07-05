import pool from '../db.js'

export const createCalculator = async (req, res) => {
  const { title, formula, variables, resultUnit } = req.body;
  const userEmail = req.user.email
  try {
    const result = await pool.query(
      `INSERT INTO calculators (title, formula, variables, author_email, result_unit, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       RETURNING *`,
      [title, formula, JSON.stringify(variables), userEmail, resultUnit]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Ошибка сохранения калькулятора:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
}
