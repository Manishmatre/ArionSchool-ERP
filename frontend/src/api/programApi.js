import api from './axios';

export const getAllPrograms = async () => {
  const response = await api.get('/programs');
  return response.data;
};

export const getProgram = async (id) => {
  const response = await api.get(`/programs/${id}`);
  return response.data;
};

export const createProgram = async (data) => {
  const response = await api.post('/programs/admin', data);
  return response.data;
};

export const updateProgram = async (id, data) => {
  const response = await api.put(`/programs/admin/${id}`, data);
  return response.data;
};

export const checkProgramDependencies = async (id) => {
  const response = await api.get(`/programs/admin/${id}/check-dependencies`);
  return response.data;
};

export const deleteProgram = async (id, deleteAssociated = false) => {
  const response = await api.delete(`/programs/admin/${id}`, {
    data: { deleteAssociated }
  });
  return response.data;
};

export const getProgramStats = async () => {
  const response = await api.get('/programs/admin/stats');
  return response.data;
};
