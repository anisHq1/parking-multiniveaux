import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
})

/* Injecter le token automatiquement */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* Gérer les 401 globalement */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

/* ── Auth ── */
export const authAPI = {
  register : (data)  => api.post('/register', data),
  login    : (data)  => api.post('/login', data),
  getMe    : ()      => api.get('/me'),
}

/* ── Vehicles ── */
export const vehiclesAPI = {
  create  : (data)       => api.post('/vehicles', data),
  getAll  : ()           => api.get('/vehicles'),
  getById : (id)         => api.get(`/vehicles/${id}`),
  update  : (id, data)   => api.put(`/vehicles/${id}`, data),
  remove  : (id)         => api.delete(`/vehicles/${id}`),
}

/* ── Spots ── */
export const spotsAPI = {
  getAll  : (params) => api.get('/spots', { params }),
  summary : ()       => api.get('/spots/summary'),
  update  : (id, data) => api.put(`/spots/${id}`, data),
}

/* ── Sessions (entry / sortie) ── */
export const sessionsAPI = {
  entry   : (data)      => api.post('/entry', data),
  sortie  : (sessionId) => api.post(`/sortie/${sessionId}`),
  getAll  : (params)    => api.get('/sessions', { params }),
  getById : (id)        => api.get(`/sessions/${id}`),
}

/* ── Reservations ── */
export const reserveAPI = {
  create : (data) => api.post('/reserve', data),
  getAll : ()     => api.get('/reserve'),
  cancel : (id)   => api.delete(`/reserve/${id}`),
}

/* ── Dashboard ── */
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
}
export const requestsAPI = {
    getAll   : (params) => api.get('/requests', { params }),
    approve  : (id)     => api.post(`/requests/${id}/approve`),
    reject   : (id)     => api.post(`/requests/${id}/reject`),
  }

export default api
