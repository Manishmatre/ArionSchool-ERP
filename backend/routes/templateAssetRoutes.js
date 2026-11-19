const express = require('express');
const {
  getTemplateAssets,
  uploadTemplateAsset,
  deleteTemplateAsset,
  updateCompanyDetails
} = require('../controllers/templateAssetController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

router.use(protect);
router.use(authorize('super_admin'));

router.get('/', getTemplateAssets);
// Accept both field names used by older and current clients.
router.post('/upload', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'asset', maxCount: 1 }]), uploadTemplateAsset);
router.delete('/:assetKey', deleteTemplateAsset);
router.put('/company-details', updateCompanyDetails);
router.put('/info', updateCompanyDetails);

module.exports = router;
