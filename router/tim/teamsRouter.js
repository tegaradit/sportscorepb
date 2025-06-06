const express = require('express');
const router = express.Router();
const teamController = require('../../controller/tim/teamsController');
const midlewareTeams = require('../../midleware/verifyTokenTeams')

router.post('/register', teamController.upload.single('logo_club'), teamController.registerTeam);
router.post('/login', teamController.loginTeam);
router.post('/bayar', midlewareTeams, teamController.bayar);
router.post('/cek_diskon', midlewareTeams, teamController.cekDiskon)
router.get('/status-akun', midlewareTeams, teamController.cekStatusAkun)
router.post('/logout', teamController.logoutTeam)
router.get('/staff', teamController.getAllStaff);
router.get('/staff/:id', teamController.getStaffById);



module.exports = router;
