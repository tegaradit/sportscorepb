const express = require('express');
const router = express.Router();
const adminController = require('../../controller/admin/adminController');
const midlewareAdmin = require('../../midleware/verifyTokenAdmin');

// Auth
router.post('/login', adminController.loginAdmin);

// Event Organizer
router.post('/register/eo', midlewareAdmin, adminController.createEo);
router.put('/edit/eo', midlewareAdmin, adminController.editEo);
router.delete('/delete/eo', midlewareAdmin, adminController.deleteEo);
router.get('/getAll/eo', midlewareAdmin, adminController.getAllEo);
router.post('/getById/eo', midlewareAdmin, adminController.getEoById);

// Diskon
router.post('/diskon/create', midlewareAdmin, adminController.createDiskon);
router.put('/diskon/edit', midlewareAdmin, adminController.editDiskon);
router.delete('/diskon/delete', midlewareAdmin, adminController.deleteDiskon);

module.exports = router;
