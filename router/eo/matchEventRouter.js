const express = require('express');
const router = express.Router();
const matchEventController = require('../../controller/eo/matchEventController');

router.post('/:id_match/event', matchEventController.addEvent);
router.get('/:id_match/events', matchEventController.getEvents);

module.exports = router;
