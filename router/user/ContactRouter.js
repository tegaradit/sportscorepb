const controller = require ('../../controller/user/contactController');
const midleware = require ('../../midleware/verifyTokenAdmin');
const express = require('express');
const router = express.Router();

router.post('/add', controller.addContact)
router.get('/messages', midleware, controller.getAllMessages);

module.exports = router;