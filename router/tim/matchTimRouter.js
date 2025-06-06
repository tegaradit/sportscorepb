const express = require('express');
const router = express.Router();
const controller = require('../../controller/tim/matchTimController');
const verifyTokenTim = require('../../midleware/verifyTokenTeams');

router.get('/category/:categoryId', verifyTokenTim, controller.getMatchByCategoryId);

module.exports = router;