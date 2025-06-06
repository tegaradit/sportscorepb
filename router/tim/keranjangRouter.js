const express = require('express');
const router = express.Router();
const keranjangController = require('../../controller/tim/keranjangPemainController');
const authMiddleware = require('../../midleware/verifyTokenTeams');

// Gunakan upload langsung dari controller
router.post('/keranjang/add', authMiddleware, keranjangController.upload.single('foto_pemain'), keranjangController.addToKeranjang);
router.get('/keranjang/list', authMiddleware, keranjangController.getKeranjang);
router.delete('/keranjang/delete', authMiddleware, keranjangController.deleteFromKeranjang);
router.post('/keranjang/checkout', authMiddleware, keranjangController.checkoutKeranjang);
router.post('/cek_diskon', authMiddleware, keranjangController.cekDiskon)

module.exports = router;