import api from './axios';

export const communicationApi = {
  broadcast: (data) => api.post('/communications/broadcast', data),
  getPTMSlots: (params) => api.get('/communications/ptm-slots', { params }),
  createPTMSlot: (data) => api.post('/communications/ptm-slots', data),
  bookPTMSlot: (id, data) => api.put(`/communications/ptm-slots/${id}/book`, data),
  triggerAbsentee: () => api.post('/automation/trigger-absentee'),
  triggerFeeReminders: () => api.post('/automation/trigger-fee-reminders'),
  triggerBirthdays: () => api.post('/automation/trigger-birthdays')
};

export default communicationApi;
