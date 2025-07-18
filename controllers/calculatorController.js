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
 export const getAllCalculators = async (req, res) => {
  try {
    const result = await pool.query(
       `SELECT * FROM calculators ORDER BY created_at DESC`
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении калькуляторов:", error);
    res.status(500).json({ error: "Ошибка сервера при получении калькуляторов" });
  }
};
export const deleteCalculator = async (req, res) => {
  const { id } = req.body;
  try {
    const result = await pool.query(
      'DELETE FROM calculators WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Калькулятор не найден' });
    }
    res.status(200).json({ message: 'Калькулятор успешно удалён' });
  } catch (err) {
    console.error('Ошибка при удалении калькулятора:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
export const updateCalculator = async (req, res) => {
  const { id, title, formula, result_unit, variables } = req.body;
  try {
    const variablesJson = JSON.stringify(variables);
    const result = await pool.query(
      `UPDATE calculators 
       SET title = $1, formula = $2, result_unit = $3, variables = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, formula, result_unit, variablesJson, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Калькулятор не найден' });
    }
    res.status(200).json({ message: 'Калькулятор успешно изменён', calculator: result.rows[0] });
  } catch (err) {
    console.error('Ошибка при изменении калькулятора:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
export const saveCalculation = async (req, res) => {
  const { userId, title, calculator, variablesValues, result } = req.body;
   if (!userId || !title || !calculator || !variablesValues || !result) {
    return res.status(400).json({ message: "Неверные данные" });
  }
  try {
    await pool.query(
      `INSERT INTO saved_calculations (userId, title, calculator, input_values, result)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, calculator, variablesValues, result]
    );
    res.json({ message: "Сохранено успешно" });
  } catch (err) {
    console.error("Ошибка записи:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};
export const getSavedCalculations = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'userId обязателен' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM saved_calculations WHERE userId = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения сохранённых калькуляторов:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
export const removeSavedCalculation = async (req, res) => {
  const { savedCalcId } = req.query;
  if (!savedCalcId) {
    return res.status(400).json({ message: 'userId обязателен' });
  }
  try {
     await pool.query(
      `DELETE FROM saved_calculations WHERE id = $1`,
      [savedCalcId]
    );
    res.json({ message: 'Калькулятор успешно удалён' });
  } catch (err) {
    console.error('Ошибка удаления сохраненного  калькулятора:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};