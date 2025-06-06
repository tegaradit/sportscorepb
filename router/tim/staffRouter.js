const router = require('express').Router();
const staffController = require('../../controller/tim/staffController');
const midleware = require('../../midleware/verifyTokenTeams');

router.get('/', midleware, staffController.getAllStaff)

module.exports = router;