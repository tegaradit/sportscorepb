const express = require('express');
const router = express.Router();
const matchController = require('../../controller/eo/matchController');
const authMiddleware = require('../../midleware/verifyTokenEventOrganizer');

// Manual & Grup
router.post('/create/manual/grup', authMiddleware, matchController.createManualMatch);
router.post('/create/otomatis/grup', authMiddleware, matchController.generateMatchGrup);

// Final Four
router.post('/generate/finalfour', authMiddleware, matchController.generateFullFinalFour);
router.post('/final-four/advance', authMiddleware, matchController.advanceFinalFour);

// Bracket & Juara
router.post('/bracket/update-winner', authMiddleware, matchController.updateBracketWinner);
router.post('/bracket/manual', authMiddleware, matchController.manualCreateBracket);
router.get('/juara/:id_kategori', matchController.getHasilJuara);

// Match Event & Waktu
router.post('/event', authMiddleware, matchController.addMatchEvent);
// router.post('/start-babak', authMiddleware, matchController.startBabak);

router.post('/update-klasemen-per-kategori', matchController.updateKlasemenSemuaByKategori);


// Klasemen & Selesai
router.get('/matches', matchController.getMatchesByKategori);
router.post('/update-klasemen', authMiddleware, matchController.updateKlasemenFromMatch);
router.post('/klasemen/by-kategori', matchController.getKlasemenByKategori);
router.post('/selesai', authMiddleware, matchController.selesaiMatch);
router.post('/selesaikan', authMiddleware, matchController.selesaikanMatchDanUpdateKlasemen);
router.get('/bracket', matchController.getBrackets)
router.get('/:id/detail', matchController.getMatchDetail);



module.exports = router;
