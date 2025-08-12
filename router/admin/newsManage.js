const controller = require('../../controller/admin/newsManage');
const admin = require('../../midleware/verifyTokenAdmin');
const express = require('express');
const router = express.Router();

router.post('/create', admin, controller.upload, controller.createNews);
router.post('/edit', admin, controller.upload, controller.editNews);
router.post('/delete', admin, controller.deleteNews);

module.exports = router;