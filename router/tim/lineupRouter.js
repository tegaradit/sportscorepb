const express = require('express');
const router = express.Router();
const lineupController = require('../../controller/tim/lineupController');
const midleware = require('../../midleware/verifyTokenTeams')

router.get('/:id_match',midleware, lineupController.getLineup);
router.get('/staff/:id_match',midleware, lineupController.getStaffLineup);//staff
router.get('/all/:id_match', lineupController.getLineupAll);
router.get('/all/staff/:id_match', lineupController.getStaffLineupAll); //staff
router.post('/:id_match',midleware, lineupController.addToLineup);
router.post('/:id_match/staff',midleware, lineupController.addStaffToLineup); //staff
router.delete('/:id_match/:id_pemain_event/pemain',midleware, lineupController.removeFromLineup);
router.delete('/:id_match/:id_staff_event/staff', midleware, lineupController.removeStaffFromLineup)// staff
router.get('/list/:id_match/:id_team', lineupController.getLineupDropdown)
router.get('/list/:id_match/:id_team/staff', lineupController.getStaffLineupDropdown) //staff

module.exports = router;
