import axios from 'axios'

const instance = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 5000,
})

// Add JWT token to request headers if available
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

export default instance

// Optional: attach a response interceptor to normalize errors (frontend-friendly)
instance.interceptors.response.use(
  response => response,
  error => {
    // Normalize network / timeout errors into a simple message
    if (error.code === 'ECONNABORTED') {
      error._message = 'Request timed out';
    } else if (error.response == null) {
      error._message = 'Could not reach backend at http://localhost:5000';
    } else if (error.response.data && error.response.data.error) {
      error._message = error.response.data.error;
    }
    return Promise.reject(error);
  }
)
