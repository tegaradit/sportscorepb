const express = require('express');
const router = express.Router();
const matchRuntime = require('../../controller/eo/matchRuntimeController');


router.post('/start-babak', matchRuntime.startBabak);
router.post('/stop-babak', matchRuntime.stopBabak);
router.post('/lanjut-babak', matchRuntime.lanjutBabak);
router.post('/selesaikan', matchRuntime.selesaikanMatch);
router.post('/resume', matchRuntime.resumeBabak); // ✅ ini yang baru
router.post('/reset', matchRuntime.resetMatchManual)
router.post('/resetfull', matchRuntime.resetFullMatch)

module.exports = router;
