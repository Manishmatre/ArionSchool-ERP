const express = require('express');
const router = express.Router();
const {
  getItems,
  createItem,
  updateItem,
  recordStockMovement,
  getAssets,
  createAsset
} = require('../controllers/inventoryController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

const inventoryRoles = ['super_admin', 'school_admin', 'franchise_admin', 'principal', 'accountant', 'librarian'];

// Inventory Items
router.route('/items')
  .get(authorize(...inventoryRoles), getItems)
  .post(authorize(...inventoryRoles), createItem);

router.route('/items/:id')
  .put(authorize(...inventoryRoles), updateItem);

// Stock Movement
router.post('/stock-movement', authorize(...inventoryRoles), recordStockMovement);

// Assets
router.route('/assets')
  .get(authorize(...inventoryRoles), getAssets)
  .post(authorize(...inventoryRoles), createAsset);

module.exports = router;
