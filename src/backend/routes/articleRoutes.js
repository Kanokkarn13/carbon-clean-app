// src/backend/routes/articleRoutes.js
const express = require('express');
const { listArticles, getArticle } = require('../controllers/articleController');

const router = express.Router();

router.get('/articles', listArticles);
router.get('/articles/:id', getArticle);

module.exports = router;
