const express = require('express');
const router = express.Router();
const { verifyCertificate, getCertificateImage } = require('../controllers/certificateVerificationController');

router.get('/verify-certificate', verifyCertificate);
router.get('/certificate/:type/:id/image', getCertificateImage);

module.exports = router;
