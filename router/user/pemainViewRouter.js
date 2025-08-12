const controller = require('../../controller/user/PemainViewController');
const express = require('express');
const router = express.Router();

router.get('/', controller.getAllPlayers);
router.get('/:id', controller.detailPlayer);

module.exports = router;