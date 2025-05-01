const express = require('express');
const router = express.Router();
const pemainController = require('../controller/pemainController');
const midlewareTeams = require('../midleware/verifyTokenTeams')

router.get('/',midlewareTeams, pemainController.getAllPemain );
router.post('/getById',midlewareTeams, pemainController.getPemainById );
router.post('/edit',midlewareTeams, pemainController.uploadFotoPemain, pemainController.editPemain);

module.exports = router;