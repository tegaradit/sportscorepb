const express = require('express');
const router = express.Router();
const teamController = require('../controller/teamsController');
const midlewareTeams = require('../midleware/verifyTokenTeams')

router.post('/register', teamController.upload.single('logo_club'), teamController.registerTeam);
router.post('/login', teamController.loginTeam);
router.post('/bayar', midlewareTeams, teamController.bayar)


module.exports = router;
