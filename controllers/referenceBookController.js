import pool from '../db.js'

export const addToReferenceData = async (req, res) => {
  try {
    const { title, text, textImages, tableImages } = req.body;

    if (!title || !text) {
      return res.status(400).json({ ok: false, message: "Title and text are required" });
    }

    const query = `
      INSERT INTO reference_data (title, text, text_images, table_images, updated_at)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW())
      RETURNING *;
    `;

    const values = [
      title,
      text,
      JSON.stringify(textImages || []),
      JSON.stringify(tableImages || []),
    ];

    const result = await pool.query(query, values);
    const newRef = result.rows[0];

    res.status(201).json({ ok: true, message: 'Reference added', data: newRef });
  } catch (err) {
    console.error('Error adding reference:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
};
export const getAllReferenceData = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, text, text_images, table_images, updated_at
      FROM reference_data
      ORDER BY updated_at DESC
    `);
    const data = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      text: row.text,
      textImages: row.text_images,  
      tableImages: row.table_images, 
      updated_at: row.updated_at
    }));
    res.status(200).json(data);
  } catch (err) {
    console.error('Ошибка при получении справочников:', err);
    res.status(500).json({ message: 'Ошибка при получении данных' });
  }
};
export const updateReferenceData = async (req, res) => {
  try {
    const { id, title, text, textImages, tableImages } = req.body;
    if (!id) {
      return res.status(400).json({ ok: false, message: "ID is required" });
    }
    if (!title || !text) {
      return res.status(400).json({ ok: false, message: "Title and text are required" });
    }
    const query = `
      UPDATE reference_data
      SET
        title = $1,
        text = $2,
        text_images = $3::jsonb,
        table_images = $4::jsonb,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;
    const values = [
      title,
      text,
      JSON.stringify(textImages || []),
      JSON.stringify(tableImages || []),
      id,
    ];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Reference not found' });
    }
    const updatedRef = result.rows[0];
    res.status(200).json({ ok: true, message: 'Reference updated', data: updatedRef });
  } catch (err) {
    console.error('Error updating reference:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
};
export const deleteReferenceData = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ ok: false, message: "ID is required" });
    }
    const query = `
      DELETE FROM reference_data
      WHERE id = $1
      RETURNING *;
    `;
    const values = [id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Reference not found" });
    }
    res.status(200).json({ ok: true, message: "Reference deleted", data: result.rows[0] });
  } catch (err) {
    console.error("Error deleting reference:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};