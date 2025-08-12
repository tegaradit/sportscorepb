const controller = require('../../controller/user/teamViewController')
const express = require('express');
const router = express.Router();

router.get('/', controller.getAllTeams)
router.get('/:id_team', controller.DetailTeam)
module.exports = router;