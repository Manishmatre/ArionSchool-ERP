const express = require('express');
const router = express.Router();
const {
  generateSalary,
  getAllSalaries,
  getSalary,
  paySalary,
  getSalaryStats
} = require('../controllers/staffSalaryController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

router.get('/stats', authorize('super_admin', 'franchise_admin'), getSalaryStats);
router.post('/generate', authorize('super_admin', 'franchise_admin'), generateSalary);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin'), getAllSalaries);

router.route('/:id')
  .get(authorize('super_admin', 'franchise_admin'), getSalary);

router.put('/:id/pay', authorize('super_admin', 'franchise_admin'), paySalary);

module.exports = router;
