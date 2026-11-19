const LibraryBook = require('../models/LibraryBook');
const BookIssue = require('../models/BookIssue');
const Student = require('../models/Student');
const Staff = require('../models/Staff');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. BOOK CATALOG CRUD
// ==========================================
exports.getBooks = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = { isActive: true };
    if (franchiseId) query.franchise = franchiseId;

    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { author: { $regex: req.query.search, $options: 'i' } },
        { isbn: { $regex: req.query.search, $options: 'i' } },
        { barcode: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.availableOnly === 'true') {
      query.availableCopies = { $gt: 0 };
    }

    const books = await LibraryBook.find(query).sort({ title: 1 });
    res.status(200).json({ success: true, count: books.length, data: books });
  } catch (error) {
    next(error);
  }
};

exports.createBook = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { totalCopies = 1 } = req.body;
    const book = await LibraryBook.create({
      ...req.body,
      franchise: franchiseId,
      availableCopies: totalCopies
    });
    res.status(201).json({ success: true, message: 'Book added to library catalog', data: book });
  } catch (error) {
    next(error);
  }
};

exports.updateBook = async (req, res, next) => {
  try {
    const book = await LibraryBook.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.status(200).json({ success: true, message: 'Book updated successfully', data: book });
  } catch (error) {
    next(error);
  }
};

exports.deleteBook = async (req, res, next) => {
  try {
    const book = await LibraryBook.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.status(200).json({ success: true, message: 'Book archived from catalog' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. BOOK CIRCULATION (ISSUE & RETURN)
// ==========================================
exports.getIssues = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.status) query.status = req.query.status;
    if (req.query.student) query.student = req.query.student;

    const issues = await BookIssue.find(query)
      .populate('book', 'title author isbn barcode shelfLocation')
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .populate('staff', 'personalInfo.firstName personalInfo.lastName staffId')
      .populate('issuedBy', 'name email')
      .sort({ issueDate: -1 });

    // Update overdue status dynamically
    const now = new Date();
    const updatedIssues = issues.map(issue => {
      const doc = issue.toObject();
      if (doc.status === 'issued' && new Date(doc.dueDate) < now) {
        const diffTime = Math.abs(now - new Date(doc.dueDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        doc.status = 'overdue';
        doc.overdueDays = diffDays;
        doc.calculatedFine = diffDays * 5; // ₹5 per day
      }
      return doc;
    });

    res.status(200).json({ success: true, count: updatedIssues.length, data: updatedIssues });
  } catch (error) {
    next(error);
  }
};

exports.issueBook = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { bookId, memberType = 'student', studentId, staffId, durationDays = 14, remarks } = req.body;

    const book = await LibraryBook.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No available copies of this book in stock for issue'
      });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(durationDays));

    const issue = await BookIssue.create({
      book: bookId,
      memberType,
      student: memberType === 'student' ? studentId : undefined,
      staff: memberType === 'staff' ? staffId : undefined,
      franchise: franchiseId,
      issueDate: new Date(),
      dueDate,
      status: 'issued',
      issuedBy: req.user._id,
      remarks
    });

    // Decrement available copies
    book.availableCopies = Math.max(0, book.availableCopies - 1);
    await book.save();

    const populated = await BookIssue.findById(issue._id)
      .populate('book', 'title author isbn')
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId')
      .populate('staff', 'personalInfo.firstName personalInfo.lastName staffId');

    res.status(201).json({
      success: true,
      message: `Book issued successfully. Due date is ${dueDate.toLocaleDateString()}`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

exports.returnBook = async (req, res, next) => {
  try {
    const { issueId, finePaid = false, remarks } = req.body;
    const issue = await BookIssue.findById(issueId);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue record not found' });

    if (issue.status === 'returned') {
      return res.status(400).json({ success: false, message: 'Book is already marked as returned' });
    }

    const returnDate = new Date();
    let lateFine = 0;

    if (returnDate > new Date(issue.dueDate)) {
      const diffTime = Math.abs(returnDate - new Date(issue.dueDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      lateFine = diffDays * 5; // ₹5 per overdue day
    }

    issue.returnDate = returnDate;
    issue.status = 'returned';
    issue.lateFine = lateFine;
    issue.finePaid = finePaid;
    if (remarks) issue.remarks = remarks;
    await issue.save();

    // Increment available copies
    await LibraryBook.findByIdAndUpdate(issue.book, {
      $inc: { availableCopies: 1 }
    });

    res.status(200).json({
      success: true,
      message: `Book returned successfully.${lateFine > 0 ? ` Late fine: ₹${lateFine}` : ''}`,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};
