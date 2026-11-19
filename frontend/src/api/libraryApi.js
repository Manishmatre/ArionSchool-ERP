import api from './axios';

export const libraryApi = {
  getBooks: (params) => api.get('/library/books', { params }),
  createBook: (data) => api.post('/library/books', data),
  updateBook: (id, data) => api.put(`/library/books/${id}`, data),
  deleteBook: (id) => api.delete(`/library/books/${id}`),
  getIssues: (params) => api.get('/library/issues', { params }),
  issueBook: (data) => api.post('/library/issues', data),
  returnBook: (data) => api.post('/library/return', data)
};

export default libraryApi;
