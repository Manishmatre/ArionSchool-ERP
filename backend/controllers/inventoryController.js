const InventoryItem = require('../models/InventoryItem');
const SchoolAsset = require('../models/SchoolAsset');
const StockLog = require('../models/StockLog');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. INVENTORY ITEMS & STOCK
// ==========================================

exports.getItems = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    if (req.query.lowStock === 'true') {
      query.$expr = { $lte: ['$quantityOnHand', '$minimumStockThreshold'] };
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { code: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const items = await InventoryItem.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const item = await InventoryItem.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'Item registered in inventory', data: item });
  } catch (error) {
    next(error);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.status(200).json({ success: true, message: 'Item updated successfully', data: item });
  } catch (error) {
    next(error);
  }
};

exports.recordStockMovement = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { itemId, transactionType, quantity, unitPrice, issuedToStaff, recipientName, department, notes } = req.body;

    const item = await InventoryItem.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive quantity required' });
    }

    if (transactionType === 'outward' && item.quantityOnHand < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Available: ${item.quantityOnHand} ${item.unit}, Requested: ${qty}`
      });
    }

    // Update stock quantity
    if (transactionType === 'inward' || transactionType === 'return') {
      item.quantityOnHand += qty;
    } else if (transactionType === 'outward') {
      item.quantityOnHand -= qty;
    } else if (transactionType === 'adjustment') {
      item.quantityOnHand = qty;
    }

    if (unitPrice) item.unitCost = Number(unitPrice);
    await item.save();

    const price = Number(unitPrice || item.unitCost || 0);
    const log = await StockLog.create({
      item: item._id,
      transactionType,
      quantity: qty,
      unitPrice: price,
      totalAmount: qty * price,
      franchise: franchiseId || item.franchise,
      issuedToStaff,
      recipientName,
      department,
      performedBy: req.user._id,
      notes
    });

    res.status(201).json({
      success: true,
      message: `Stock ${transactionType} recorded successfully`,
      data: {
        item,
        log
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. ASSET MANAGEMENT
// ==========================================

exports.getAssets = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }
    if (req.query.condition && req.query.condition !== 'all') {
      query.condition = req.query.condition;
    }

    const assets = await SchoolAsset.find(query)
      .populate('assignedToStaff', 'personalInfo.firstName personalInfo.lastName')
      .populate('vendor', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: assets.length, data: assets });
  } catch (error) {
    next(error);
  }
};

exports.createAsset = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const year = new Date().getFullYear();

    const lastAsset = await SchoolAsset.findOne({ assetTag: { $regex: `^AST-${year}-` } })
      .sort({ assetTag: -1 })
      .select('assetTag');

    let nextSeq = 1;
    if (lastAsset && lastAsset.assetTag) {
      const parts = lastAsset.assetTag.split('-');
      if (parts.length === 3) nextSeq = parseInt(parts[2], 10) + 1;
    }
    const assetTag = req.body.assetTag || `AST-${year}-${String(nextSeq).padStart(4, '0')}`;

    const purchaseCost = Number(req.body.purchaseCost || 0);
    const asset = await SchoolAsset.create({
      ...req.body,
      assetTag,
      currentValue: req.body.currentValue !== undefined ? Number(req.body.currentValue) : purchaseCost,
      franchise: franchiseId
    });

    res.status(201).json({
      success: true,
      message: 'Asset registered successfully',
      data: asset
    });
  } catch (error) {
    next(error);
  }
};
