const express = require('express');
const router = express.Router();
const controller = require('../../controller/eo/eventOrganizerController');
const midleware = require('../../midleware/verifyTokenEventOrganizer')
const upload = controller.uploadEventLogo;

router.post('/login', controller.loginEo)
// 📌 POST buat event (pakai upload logo + token EO)
router.post('/create/event', midleware, upload.single('logo_event'), controller.createEvent);
router.get('/kategory-olahraga', controller.getAllKategoriOlahraga)

// 📌 PUT update event
router.put('/edit/event/:id', midleware, upload.single('logo_event'), controller.updateEvent);

// 📌 DELETE event
router.delete('/delete/event/:id', midleware, controller.deleteEvent);

module.exports = router;