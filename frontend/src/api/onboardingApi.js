import api from './axios';

export const onboardingApi = {
  preview: (data) => api.post('/onboarding/preview', data),
  commit: (data) => api.post('/onboarding/commit', data)
};

export default onboardingApi;
