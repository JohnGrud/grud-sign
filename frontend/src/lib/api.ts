import axios from 'axios'

const baseURL = import.meta.env.DEV ? '/api' : ''

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  // In development, always use the dev admin token
  const token = import.meta.env.DEV ? 'dev-admin-token' : localStorage.getItem('adminToken')

  if (token && !config.url?.startsWith('/sign/')) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('adminToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// File upload helper
export const uploadFile = async (file: File): Promise<{ fileId: string }> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/files', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

// Sign link API helpers
export const createSignLink = async (templateId: string, signerEmail?: string) => {
  const response = await api.post('/signlinks', {
    templateId,
    signerEmail,
  })
  return response.data
}

// Public signing API (no auth required)
export const getSigningSession = async (token: string) => {
  const response = await api.get(`/sign/${token}`)
  return response.data
}

export const submitSigning = async (token: string, filled: any[]) => {
  const response = await api.post(`/sign/${token}/submit`, {
    filled,
  })
  return response.data
}