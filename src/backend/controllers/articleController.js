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
