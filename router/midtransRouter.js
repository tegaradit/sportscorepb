const express = require('express');
const router = express.Router();
const controller = require('../controller/midtransController');


router.post('/callback', controller.midtransCallback)

module.exports = router;