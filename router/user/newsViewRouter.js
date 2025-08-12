const controller = require('../../controller/user/newsViewController');
const express = require('express');
const router = express.Router();


router.get('/news', controller.getNews);
router.get('/news/:id', controller.getNewsById);

module.exports = router;