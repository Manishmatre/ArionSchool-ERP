const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/books', libraryController.getBooks);
router.post(
  '/books',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'librarian']),
  libraryController.createBook
);
router.put(
  '/books/:id',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'librarian']),
  libraryController.updateBook
);
router.delete(
  '/books/:id',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'librarian']),
  libraryController.deleteBook
);

router.get('/issues', libraryController.getIssues);
router.post(
  '/issues',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'librarian']),
  libraryController.issueBook
);
router.post(
  '/return',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'librarian']),
  libraryController.returnBook
);

module.exports = router;
