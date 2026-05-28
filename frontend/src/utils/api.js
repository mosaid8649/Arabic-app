import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

export const wordsApi = {
  getAll: (params) => api.get('/words', { params }).then(r => r.data),
  getRandom: (params) => api.get('/words/random', { params }).then(r => r.data),
  getById: (id) => api.get(`/words/${id}`).then(r => r.data),
  create: (data) => api.post('/words', data).then(r => r.data),
  update: (id, data) => api.put(`/words/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/words/${id}`).then(r => r.data),
};

export const lessonsApi = {
  getAll: () => api.get('/lessons').then(r => r.data),
  getById: (id) => api.get(`/lessons/${id}`).then(r => r.data),
  create: (data) => api.post('/lessons', data).then(r => r.data),
  update: (id, data) => api.put(`/lessons/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/lessons/${id}`).then(r => r.data),
};

export const uploadApi = {
  preview: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  import: (file, lessonName) => {
    const fd = new FormData();
    fd.append('file', file);
    if (lessonName) fd.append('lessonName', lessonName);
    return api.post('/upload/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  history: () => api.get('/upload/history').then(r => r.data),
};

export const practiceApi = {
  createSession: (mode) => api.post('/practice/session', { mode }).then(r => r.data),
  endSession: (id) => api.put(`/practice/session/${id}/end`).then(r => r.data),
  recordAttempt: (data) => api.post('/practice/attempt', data).then(r => r.data),
  getStats: () => api.get('/practice/stats').then(r => r.data),
  getDailyProgress: () => api.get('/practice/daily-progress').then(r => r.data),
};

export default api;
