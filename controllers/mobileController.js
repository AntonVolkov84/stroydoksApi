import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js"; 
import crypto from "crypto";
import { sendConfirmationEmail } from "./authController.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "superrefresh";

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
};

export const register =  async (req, res) => {
  try {
    const { username, password, email, name, surname } = req.body;

    if (!username || !password || !email) {
      return res.status(422).json({ message: "Not enough data" });
    }

    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomUUID();

    const insertQuery = `
      INSERT INTO users (username, password, email, emailConfirmToken, emailConfirmed, name, surname)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, username, email, emailConfirmed, name, surname;
    `;
    const values = [username, hashed, email, emailToken, false, name, surname];
    const result = await pool.query(insertQuery, values);
    const user = result.rows[0];

      await sendConfirmationEmail(email, emailToken);

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error("mobile register error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({ message: "Not enough data" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(200).json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error("mobile login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const meMobile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
       if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [decoded.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching mobile user info:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const refreshAccessToken = async (req, res) => {
  const { token: refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const userResult = await pool.query("SELECT id FROM users WHERE id=$1", [decoded.id]);
    if (!userResult.rows.length) return res.status(404).json({ message: "User not found" });
    const accessToken = jwt.sign({ id: decoded.id, email: decoded.email }, JWT_SECRET, { expiresIn: "15m" });
    res.json({ accessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

export const getObjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `
      SELECT *
      FROM objects
      WHERE author_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("getObjects error", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const createObject = async (req, res) => {
  try {
    const { title, address } = req.body;
    const author_id = req.user.id;

    if (!title || !address) {
      return res.status(400).json({ message: "Title и address обязательны" });
    }

    const result = await pool.query(
      `INSERT INTO objects (title, address, author_id) 
       VALUES ($1, $2, $3) RETURNING *`,
      [title, address, author_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createObject", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteObject = async (req, res) => {
  try {
    const objectId = parseInt(req.params.id);
    const authorId = req.user.id;
    const object = await pool.query(
      "SELECT * FROM objects WHERE id = $1 AND author_id = $2",
      [objectId, authorId]
    );

    if (!object.rows.length) {
      return res.status(404).json({ message: "Объект не найден или доступ запрещён" });
    }
    await pool.query("DELETE FROM send_works WHERE object_id = $1", [objectId]);
    await pool.query("DELETE FROM objects WHERE id = $1", [objectId]);
    res.status(200).json({ message: "Объект успешно удалён" });
  } catch (err) {
    console.error("deleteObject error:", err);
    res.status(500).json({ message: "Внутренняя ошибка сервера" });
  }
};


export const getPendingWorks = async (req, res) => {
  try {
    const workerId = req.user.id; 

    const result = await pool.query(
      `
      SELECT * FROM pending_works
      WHERE worker_id = $1
      ORDER BY created_at DESC
      `,
      [workerId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getPendingWorks error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addPendingWork = async (req, res) => {
  try {
    const workerId = req.user.id; 
    const { title, unit, quantity } = req.body;
    if (!title || !unit || !quantity) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    const result = await pool.query(
      `
      INSERT INTO pending_works (worker_id, title, unit, quantity)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [workerId, title, unit, quantity]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("addPendingWork error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePendingWork = async (req, res) => {
  try {
    const workerId = req.user.id; 
    const { workId } = req.params;
    const { title, unit, quantity } = req.body;

    if (!title || !unit || !quantity) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }
    const result = await pool.query(
      `
      UPDATE pending_works
      SET title = $1,
          unit = $2,
          quantity = $3,
          updated_at = NOW()
      WHERE id = $4 AND worker_id = $5
      RETURNING *
      `,
      [title, unit, quantity, workId, workerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Работа не найдена или доступ запрещён" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("updatePendingWork error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePendingWork = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { workId } = req.params;

    const result = await pool.query(
      `
      DELETE FROM pending_works
      WHERE id = $1 AND worker_id = $2
      RETURNING *
      `,
      [workId, workerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Работа не найдена или доступ запрещён" });
    }

    return res.json({ message: "Работа успешно удалена" });
  } catch (err) {
    console.error("deletePendingWork error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getRecipients = async (req, res) => {
  try {
    const workerId = req.user.id;
    const result = await pool.query(
      `SELECT u.id, u.name, u.surname, u.email
       FROM recipients r
       JOIN users u ON u.id = r.recipient_id
       WHERE r.worker_id = $1
       ORDER BY u.name`,
      [workerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getRecipients error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const addRecipient = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { email } = req.body;
    const userRes = await pool.query(
      "SELECT id, name, surname FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: "Пользователь с таким email не найден" });
    }
    const recipientId = userRes.rows[0].id;
    const existing = await pool.query(
      "SELECT 1 FROM recipients WHERE worker_id = $1 AND recipient_id = $2",
      [workerId, recipientId]
    );

    if (existing.rowCount === 0) {
         await pool.query(
        `INSERT INTO recipients (worker_id, recipient_id) VALUES ($1, $2)`,
        [workerId, recipientId]
      );
    }
    res.json(userRes.rows[0]);
  } catch (err) {
    console.error("addRecipient error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendWorks = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { recipient_id, work_ids } = req.body;
    if (!recipient_id || !Array.isArray(work_ids) || work_ids.length === 0) {
      return res.status(400).json({ error: "Не указан получатель или список работ" });
    }
    const { rows: works } = await pool.query(
      `SELECT id, title, unit, quantity
       FROM pending_works
       WHERE worker_id = $1 AND id = ANY($2)`,
      [workerId, work_ids]
    );

    if (works.length === 0) {
      return res.status(404).json({ error: "Работы не найдены" });
    }

    const inserted = [];
    for (const work of works) {
      const { rows } = await pool.query(
        `INSERT INTO send_works (worker_id, recipient_id, title, unit, quantity)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [workerId, recipient_id, work.title, work.unit, work.quantity]
      );
      inserted.push(rows[0]);
    }
    await pool.query(
      `DELETE FROM pending_works WHERE worker_id = $1 AND id = ANY($2)`,
      [workerId, work_ids]
    );

    return res.json({
      message: "Работы успешно отправлены",
      recipient_id,
      sent: inserted,
    });
  } catch (err) {
    console.error("sendWorks error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
export const assignObjectToWork = async (req, res) => {
  try {
    const userId = req.user.id;
    const { work_ids, object_id } = req.body;

    if (!object_id || !Array.isArray(work_ids) || work_ids.length === 0) {
      return res.status(400).json({ error: "Не указаны объект или работы" });
    }

    await pool.query(
      "UPDATE send_works SET object_id = $1 WHERE recipient_id = $2 AND id = ANY($3)",
      [object_id, userId, work_ids]
    );
    res.json({ message: "Работы успешно присвоены объекту" });
  } catch (err) {
    console.error("assignObjectToWork error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getReceivedWorks = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `
      SELECT sw.*, 
      u.name AS sender_name, 
      u.surname AS sender_surname, 
      o.title AS object_title
      FROM send_works sw
      JOIN users u ON sw.worker_id = u.id
      LEFT JOIN objects o ON sw.object_id = o.id
      WHERE sw.recipient_id = $1
      ORDER BY sw.created_at DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getReceivedWorks error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getSendWorks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { object_id } = req.query;

    let query = "SELECT * FROM send_works WHERE recipient_id = $1";
    const params = [userId];

    if (object_id) {
      query += " AND object_id = $2";
      params.push(object_id);
    }
    query += " ORDER BY created_at DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("getSendWorks error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params; 
    const { status } = req.body; 
   
    if (!status) {
      return res.status(400).json({ error: "Не указан статус" });
    }
    await pool.query(
      "UPDATE send_works SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id]
    );
    res.json({ message: "Статус обновлён" });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const updateSendWork = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, unit, quantity } = req.body;

    if (!title || !unit || !quantity) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    const { rows } = await pool.query(
      `UPDATE send_works 
       SET title = $1, unit = $2, quantity = $3 
       WHERE id = $4
       RETURNING *`,
      [title, unit, quantity, id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("updateSendWork error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getFinishedSendWorks = async (req, res) => {
  try {
    const recipientId = req.user.id; 
    const { object_id, status } = req.query;
    let query = `
      SELECT sw.*, u.*
      FROM send_works sw
      JOIN users u ON sw.worker_id = u.id
      WHERE sw.recipient_id = $1
    `;
    const params = [recipientId];
    if (object_id) {
      query += " AND sw.object_id = $2";
      params.push(object_id);
    }
    if (status) {
      query += object_id ? " AND sw.status = $3" : " AND sw.status = $2";
      params.push(status);
    }
    query += " ORDER BY sw.created_at DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("getFinishedSendWorks error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getSendWorksHistory = async (req, res) => {
  try {
    const workerId = req.user.id;
    const query = `
      SELECT 
        sw.*, 
        COALESCE(o.title, 'Нет еще') AS object_title
      FROM send_works sw
      LEFT JOIN objects o ON sw.object_id = o.id
      WHERE sw.worker_id = $1
      ORDER BY sw.created_at DESC
    `;

    const { rows } = await pool.query(query, [workerId]);
    res.json(rows);
  } catch (err) {
    console.error("getSendWorksHistory error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const exportWorks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { object_id } = req.body;
    if (!object_id) {
      return res.status(400).json({ error: "Не указан объект (источник экспорта)" });
    }
    const { rows: works } = await pool.query(
      "SELECT title, unit, quantity FROM send_works WHERE object_id = $1",
      [object_id]
    );
    if (works.length === 0) {
      return res.status(404).json({ error: "Нет работ для экспорта" });
    }
    const values = works
      .map(
        (_, i) =>
          `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, NOW(), NOW())`
      )
      .join(",");
    const params = works.flatMap((w) => [userId, w.title, w.unit, w.quantity]);
    await pool.query(
      `INSERT INTO pending_works (worker_id, title, unit, quantity, created_at, updated_at)
       VALUES ${values}`,
      params
    );

    res.json({ message: "Работы успешно экспортированы пользователю" });
  } catch (err) {
    console.error("exportWorks error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};
export const backupObject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { object_id } = req.body;
    if (!object_id) {
      return res.status(400).json({ error: "Не указан object_id" });
    }
     const { rows: objectRows } = await pool.query(
      "SELECT title FROM objects WHERE id = $1",
      [object_id]
    );
    if (!objectRows.length) {
      return res.status(404).json({ error: "Объект не найден" });
    }
    const objectTitle = objectRows[0].title;
    const { rows: works } = await pool.query(
      "SELECT title, unit, quantity FROM send_works WHERE object_id = $1",
      [object_id]
    );
    if (!works.length) {
      console.log(`backupObject: у объекта ${object_id} нет работ — бэкап пропущен`);
      return res.json({ message: "Нет работ для сохранения, бэкап не требуется" });
    }
   const payload = {
      userId,
      title: `Все работы по объекту - ${objectTitle}. Удаление`,
      rows: works.map(w => ({
        name: w.title,
        unit: w.unit,
        quantity: String(w.quantity)
      }))
    };
    await pool.query(
      `INSERT INTO saved_billofquantities (userid, title, rows)
       VALUES ($1, $2, $3)`,
      [payload.userId, payload.title, JSON.stringify(payload.rows)]
    );
    res.json({ message: "Работы успешно сохранены на сайте" });
  } catch (err) {
    console.error("backupObject error:", err);
    res.status(500).json({ error: "Ошибка сервера при сохранении работ" });
  }
};