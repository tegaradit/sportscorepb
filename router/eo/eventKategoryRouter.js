const express = require('express');
const router = express.Router();
const controller = require('../../controller/eo/eventKategoryController');
const midleware = require('../../midleware/verifyTokenEventOrganizer')

// GET semua kategori dari 1 event
router.get('/event/:id_event', controller.getKategoriByEvent);

// GET detail kategori

router.get('/:id/full', controller.getFullInfoByKategori);

// POST kategori baru
router.post('/',midleware, controller.createKategori);

// PUT update kategori
router.put('/:id',midleware, controller.updateKategori);

// DELETE kategori
router.delete('/:id',midleware, controller.deleteKategori);

// Invite tim ke event (langsung diterima)
router.post('/invite-teams', midleware, controller.inviteTeamToEvent);

// Update grup tim yang sudah terdaftar
router.post('/update-grub', midleware, controller.updateGrubTeam);

// Ambil semua tim dalam satu grub tertentu
router.get('/teams-by-grub', controller.getTeamsByGrub);
router.get('/grub-list', controller.getAllGrubWithTeams);

router.delete('/hapus-tim', midleware, controller.deleteTeamFromKategori);
router.get('/kategori-list/:id_event', controller.getKategoriWithGrupByEvent);
router.get('/peserta/:id_kategori', controller.getPesertaByKategori);
router.get('/teams', controller.getAllTeamWithSearch)





router.get('/:id', controller.getKategoriById); //harus paling bawah
module.exports = router;