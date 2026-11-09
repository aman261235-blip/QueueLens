
import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Automatically attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('queuelens_token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Centralized API error handling
apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status
    const requestUrl = error.config?.url || ''

    // Handle expired or invalid JWT tokens.
    // Do not log out users for incorrect login credentials.
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register')

    if (status === 401 && !isAuthRequest) {
      localStorage.removeItem('queuelens_token')
      localStorage.removeItem('queuelens_user')

      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }

    // Friendly error messages without changing Axios error structure.
    if (!error.response) {
      error.userMessage = error.code === 'ECONNABORTED'
        ? 'Request timed out. Please try again.'
        : 'Unable to connect to the server. Check your backend connection.'
    } else if (status === 403) {
      error.userMessage = 'You do not have permission to perform this action.'
    } else if (status === 404) {
      error.userMessage = 'The requested resource was not found.'
    } else if (status >= 500) {
      error.userMessage = 'Server error. Please try again later.'
    } else {
      error.userMessage =
        error.response.data?.detail || 'Something went wrong.'
    }

    return Promise.reject(error)
  }
)

export default apiClient
