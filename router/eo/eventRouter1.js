const express = require('express');
const router = express.Router();
const controller = require('../../controller/eo/eventController1');
const midleware = require('../../midleware/verifyTokenEventOrganizer')
const upload = controller.uploadEventLogo;

router.get('/', controller.getAllEvents);
router.post('/create/event', midleware, upload.single('logo_event'), controller.createEvent);
router.get('/kategory-olahraga', controller.getAllKategoriOlahraga)
router.put('/edit/event/:id', midleware, upload.single('logo_event'), controller.updateEvent);
router.delete('/delete/event/:id', midleware, controller.deleteEvent);
router.get('/:id/full-info', controller.getFullEventInfo);
router.get('/search-olahraga', controller.searchEventByOlahraga);
router.get('/:id', controller.getEventById);

module.exports = router;