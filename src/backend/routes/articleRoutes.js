// src/backend/routes/articleRoutes.js
const express = require('express');
const { listArticles } = require('../controllers/articleController');

const router = express.Router();

router.get('/articles', listArticles);

module.exports = router;
