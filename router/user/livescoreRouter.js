const express = require('express');
const router = express.Router();
const controller = require('../../controller/user/livescoreController');

router.get('/livescore', controller.getLiveScores);

module.exports = router;