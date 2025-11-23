// src/backend/controllers/articleController.js
const db = require('../config/db');

const TABLE = process.env.KNOWLEDGE_TABLE || 'knowledge_article';

exports.listArticles = async (_req, res) => {
  try {
    const sql = `
      SELECT id, title, content, cover_image_url, author_id, create_at, update_at
      FROM \`${TABLE}\`
      ORDER BY create_at DESC, id DESC
      LIMIT 100
    `;
    const [rows] = await db.query(sql);
    res.json({ items: rows });
  } catch (err) {
    console.error('[listArticles] error:', err);
    res.status(500).json({ error: 'Failed to load articles' });
  }
};

exports.getArticle = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const sql = `
      SELECT id, title, content, cover_image_url, author_id, create_at, update_at
      FROM \`${TABLE}\`
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [id]);
    if (!rows || !rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[getArticle] error:', err);
    res.status(500).json({ error: 'Failed to load article' });
  }
};
