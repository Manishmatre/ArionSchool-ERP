import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiBook, FiBookOpen, FiPlus, FiSearch, FiCheck, FiFilter, FiClock, FiAlertTriangle, FiUser
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import libraryApi from '../../api/libraryApi';
import studentApi from '../../api/studentApi';
import staffApi from '../../api/staffApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton
} from '../../components/ui';

const CATEGORIES = [
  'textbook', 'reference', 'fiction', 'non_fiction', 'science',
  'mathematics', 'history', 'literature', 'magazine', 'journal', 'other'
];

const SchoolLibrary = () => {
  const [activeTab, setActiveTab] = useState('books');
  const [loading, setLoading] = useState(true);

  // Books State
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    barcode: '',
    category: 'textbook',
    totalCopies: 5,
    shelfLocation: 'Shelf A-1',
    price: 350
  });

  // Circulation State
  const [issues, setIssues] = useState([]);
  const [issueStatusFilter, setIssueStatusFilter] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    bookId: '',
    memberType: 'student',
    studentId: '',
    staffId: '',
    durationDays: 14,
    remarks: ''
  });

  // Return Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedIssueForReturn, setSelectedIssueForReturn] = useState(null);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [finePaid, setFinePaid] = useState(false);

  // Search Members for Issue
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    loadBooks();
    loadIssues();
    loadMembers();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      const res = await libraryApi.getBooks(params);
      setBooks(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load library catalog');
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = async () => {
    try {
      const params = {};
      if (issueStatusFilter) params.status = issueStatusFilter;
      const res = await libraryApi.getIssues(params);
      setIssues(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMembers = async () => {
    try {
      const [studRes, stfRes] = await Promise.all([
        studentApi.getAllStudents({ limit: 50 }),
        staffApi.getAllStaff()
      ]);
      setStudents(studRes.data?.data || []);
      setStaffList(stfRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      await libraryApi.createBook(bookForm);
      toast.success('Book registered in library catalog');
      setShowAddBookModal(false);
      setBookForm({
        title: '',
        author: '',
        publisher: '',
        isbn: '',
        barcode: '',
        category: 'textbook',
        totalCopies: 5,
        shelfLocation: 'Shelf A-1',
        price: 350
      });
      loadBooks();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add book');
    }
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    try {
      await libraryApi.issueBook(issueForm);
      toast.success('Book issued successfully');
      setShowIssueModal(false);
      setIssueForm({
        bookId: '',
        memberType: 'student',
        studentId: '',
        staffId: '',
        durationDays: 14,
        remarks: ''
      });
      loadBooks();
      loadIssues();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to issue book');
    }
  };

  const handleReturnBook = async (e) => {
    e.preventDefault();
    if (!selectedIssueForReturn) return;
    try {
      await libraryApi.returnBook({
        issueId: selectedIssueForReturn._id,
        finePaid,
        remarks: returnRemarks
      });
      toast.success('Book marked as returned');
      setShowReturnModal(false);
      setSelectedIssueForReturn(null);
      loadBooks();
      loadIssues();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to process book return');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Library Management"
        subtitle="Catalog inventory, ISBN/Barcode tracking, student & staff book circulation, and automated overdue fines."
      />

      {/* Tabs */}
      <SubNavTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'books', label: 'Book Catalog', icon: FiBook, badge: books.length },
          { id: 'circulation', label: 'Active Circulation & Loans', icon: FiBookOpen, badge: issues.filter(i => i.status === 'issued' || i.status === 'overdue').length }
        ]}
      />

      {/* TAB 1: BOOKS CATALOG */}
      {activeTab === 'books' && (
        <div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by title, author, ISBN or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadBooks()}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                }}
                className="px-3 py-2 border rounded-lg text-sm bg-gray-50 capitalize"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                ))}
              </select>

              <Button onClick={loadBooks} className="text-sm">Filter</Button>
            </div>

            <Button
              onClick={() => setShowAddBookModal(true)}
              className="flex items-center space-x-2 text-sm"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add New Book</span>
            </Button>
          </div>

          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Title & Details</TableHeader>
                  <TableHeader>Author</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>ISBN / Barcode</TableHeader>
                  <TableHeader>Shelf Location</TableHeader>
                  <TableHeader>Stock</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {books.length === 0 ? (
                  <TableEmpty colSpan={7} message="No books found in the library catalog." />
                ) : (
                  books.map(book => (
                    <TableRow key={book._id}>
                      <TableCell>
                        <span className="font-semibold text-gray-900 block">
                          {book.title}
                        </span>
                        {book.publisher && (
                          <span className="text-xs text-gray-400 block">Pub: {book.publisher}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {book.author}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 capitalize">
                          {book.category?.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {book.isbn || book.barcode || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-indigo-600">
                        {book.shelfLocation || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                          book.availableCopies > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {book.availableCopies} / {book.totalCopies} Available
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          disabled={book.availableCopies <= 0}
                          onClick={() => {
                            setIssueForm(prev => ({ ...prev, bookId: book._id }));
                            setShowIssueModal(true);
                          }}
                          className={`text-xs px-2.5 py-1 rounded font-medium ${
                            book.availableCopies > 0
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Issue Book
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>
      )}

      {/* TAB 2: ACTIVE CIRCULATION */}
      {activeTab === 'circulation' && (
        <div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <select
                value={issueStatusFilter}
                onChange={(e) => {
                  setIssueStatusFilter(e.target.value);
                  loadIssues();
                }}
                className="px-3 py-1.5 border rounded-lg text-xs bg-gray-50 font-medium"
              >
                <option value="">All Loan Records</option>
                <option value="issued">Active Loans</option>
                <option value="overdue">Overdue Fines</option>
                <option value="returned">Returned History</option>
              </select>
            </div>

            <Button
              onClick={() => {
                if (books.length > 0) setIssueForm(prev => ({ ...prev, bookId: books[0]._id }));
                setShowIssueModal(true);
              }}
              className="flex items-center space-x-2 text-xs"
            >
              <FiPlus className="w-4 h-4" />
              <span>Issue Book to Member</span>
            </Button>
          </div>

          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Book Title</TableHeader>
                  <TableHeader>Borrower (Member)</TableHeader>
                  <TableHeader>Issue Date</TableHeader>
                  <TableHeader>Due Date</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Late Fine</TableHeader>
                  <TableHeader>Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {issues.length === 0 ? (
                  <TableEmpty colSpan={7} message="No circulation records found." />
                ) : (
                  issues.map(issue => {
                    const isOverdue = issue.status === 'overdue' || (issue.status === 'issued' && new Date(issue.dueDate) < new Date());
                    const borrowerName = issue.memberType === 'student'
                      ? `${issue.student?.personalInfo?.firstName || ''} ${issue.student?.personalInfo?.lastName || ''}`
                      : `${issue.staff?.personalInfo?.firstName || ''} ${issue.staff?.personalInfo?.lastName || ''}`;

                    return (
                      <TableRow key={issue._id}>
                        <TableCell className="font-semibold text-gray-900">
                          {issue.book?.title}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900 block">
                            {borrowerName || 'Member'}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {issue.memberType} ({issue.student?.studentId || issue.staff?.staffId || '-'})
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(issue.issueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          <span className={isOverdue ? 'text-red-600' : 'text-gray-700'}>
                            {new Date(issue.dueDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {issue.status === 'returned' ? (
                            <StatusBadge status="success" text="RETURNED" />
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-800 flex items-center space-x-1 w-max">
                              <FiAlertTriangle className="w-3 h-3" />
                              <span>OVERDUE ({issue.overdueDays || 1}d)</span>
                            </span>
                          ) : (
                            <StatusBadge status="info" text="ISSUED" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-gray-800">
                          {issue.calculatedFine || issue.lateFine > 0 ? (
                            <span className="text-red-600">₹{issue.calculatedFine || issue.lateFine}</span>
                          ) : (
                            <span className="text-gray-400">₹0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {issue.status !== 'returned' ? (
                            <button
                              onClick={() => {
                                setSelectedIssueForReturn(issue);
                                setFinePaid(false);
                                setReturnRemarks('');
                                setShowReturnModal(true);
                              }}
                              className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                            >
                              Return Book
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Completed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>
      )}

      {/* ADD BOOK MODAL */}
      {showAddBookModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Add Book to Library Catalog
            </h3>
            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="e.g. Higher Secondary Physics - Part 1"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    placeholder="e.g. H. C. Verma"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 capitalize"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="978-0-123456-47-2"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={bookForm.barcode}
                    onChange={(e) => setBookForm({ ...bookForm, barcode: e.target.value })}
                    placeholder="BAR-998822"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total Copies
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bookForm.totalCopies}
                    onChange={(e) => setBookForm({ ...bookForm, totalCopies: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shelf Location
                  </label>
                  <input
                    type="text"
                    value={bookForm.shelfLocation}
                    onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
                    placeholder="A-1, Bay 3"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={bookForm.price}
                    onChange={(e) => setBookForm({ ...bookForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddBookModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Book
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE BOOK MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Issue Book to Member
            </h3>
            <form onSubmit={handleIssueBook} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Book
                </label>
                <select
                  value={issueForm.bookId}
                  onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  required
                >
                  <option value="">-- Choose Book --</option>
                  {books.map(b => (
                    <option key={b._id} value={b._id} disabled={b.availableCopies <= 0}>
                      {b.title} ({b.availableCopies} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Member Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 text-xs">
                    <input
                      type="radio"
                      name="memberType"
                      value="student"
                      checked={issueForm.memberType === 'student'}
                      onChange={() => setIssueForm({ ...issueForm, memberType: 'student' })}
                      className="text-indigo-600"
                    />
                    <span>Student</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs">
                    <input
                      type="radio"
                      name="memberType"
                      value="staff"
                      checked={issueForm.memberType === 'staff'}
                      onChange={() => setIssueForm({ ...issueForm, memberType: 'staff' })}
                      className="text-indigo-600"
                    />
                    <span>Staff Member</span>
                  </label>
                </div>
              </div>

              {issueForm.memberType === 'student' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Student
                  </label>
                  <select
                    value={issueForm.studentId}
                    onChange={(e) => setIssueForm({ ...issueForm, studentId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.personalInfo?.firstName} {s.personalInfo?.lastName} ({s.studentId})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Staff Member
                  </label>
                  <select
                    value={issueForm.staffId}
                    onChange={(e) => setIssueForm({ ...issueForm, staffId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Staff --</option>
                    {staffList.map(st => (
                      <option key={st._id} value={st._id}>
                        {st.personalInfo?.firstName} {st.personalInfo?.lastName} ({st.staffId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Loan Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={issueForm.durationDays}
                  onChange={(e) => setIssueForm({ ...issueForm, durationDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIssueModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Confirm Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN BOOK MODAL */}
      {showReturnModal && selectedIssueForReturn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Process Book Return
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Return book "{selectedIssueForReturn.book?.title}" and calculate late fine.
            </p>

            <form onSubmit={handleReturnBook} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <div>Due Date: <strong>{new Date(selectedIssueForReturn.dueDate).toLocaleDateString()}</strong></div>
                {selectedIssueForReturn.overdueDays > 0 && (
                  <div className="text-red-600 font-bold">
                    Overdue by {selectedIssueForReturn.overdueDays} days (Fine: ₹{selectedIssueForReturn.calculatedFine || selectedIssueForReturn.overdueDays * 5})
                  </div>
                )}
              </div>

              {selectedIssueForReturn.overdueDays > 0 && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="finePaid"
                    checked={finePaid}
                    onChange={(e) => setFinePaid(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <label htmlFor="finePaid" className="text-xs text-gray-700">
                    Late fine of ₹{selectedIssueForReturn.calculatedFine || selectedIssueForReturn.overdueDays * 5} collected in cash
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Book Condition / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Returned in good condition"
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReturnModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Confirm Return & Restock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SchoolLibrary;
