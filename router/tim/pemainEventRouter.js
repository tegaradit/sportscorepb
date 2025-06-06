const express = require('express');
const router = express.Router();
const controller = require('../../controller/tim/pemainEventController');
const verifyTokenTim = require('../../midleware/verifyTokenTeams');


router.get('/search',verifyTokenTim, controller.searchPemain);
router.post('/',verifyTokenTim, controller.tambahPemainEvent);

module.exports = router;
