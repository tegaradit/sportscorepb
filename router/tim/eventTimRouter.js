const express = require('express');
const router = express.Router();
const controller = require('../../controller/tim/eventTimController');
const verifyTokenTim = require('../../midleware/verifyTokenTeams');


router.get('/ikut-event',verifyTokenTim, controller.getEventsByTeamId);
router.put('/ikut-event',verifyTokenTim, controller.managePlayersEventMatch);
router.put('/ikut-event/staff',verifyTokenTim, controller.manageStaffEventMatch)
router.get('/ikut-event/:categoryId/players',verifyTokenTim, controller.getPlayersEventMatch);
router.get('/ikut-event/:categoryId/staff',verifyTokenTim, controller.getStaffEventMatch);

module.exports = router;