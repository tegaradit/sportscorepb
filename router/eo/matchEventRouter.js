const express = require('express');
const router = express.Router();
const matchEventController = require('../../controller/eo/matchEventController');

router.get('/:id_match/events', matchEventController.getEvents);

module.exports = router;
