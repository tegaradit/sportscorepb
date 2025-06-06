const express = require('express');
const router = express.Router();
const eventController = require('../../controller/eo/eventController');
const midleware = require('../../midleware/verifyTokenEventOrganizer');

// Ambil middleware upload dari controller

// 📌 GET semua event + filter
router.get('/', eventController.getAllEvents);

// 📌 GET kategori unik (harus ditaruh sebelum :id)
router.get('/event-categories', eventController.getUniqueCategories);

// 📌 GET full info event
router.get('/:id/full-info', eventController.getFullEventInfo);

// 📌 GET semua kategori olahraga unik
router.get('/kategori-olahraga', eventController.getKategoriOlahraga);

// 📌 Search event berdasarkan kategori olahraga
router.get('/search-olahraga', eventController.searchEventByOlahraga);


// 📌 GET 1 event by ID
router.get('/:id', eventController.getEventById);

router.post('/:kategoriId/generate-semifinal', midleware, eventController.generateSemifinal);

module.exports = router;
