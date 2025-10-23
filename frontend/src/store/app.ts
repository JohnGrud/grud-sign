import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  message: string
  type: 'success' | 'error' | 'info'
}

export const useAppStore = defineStore('app', () => {
  // Loading state
  const loading = ref(false)
  const loadingMessage = ref('')

  // Notification state
  const notification = ref<Notification | null>(null)

  // Actions
  const setLoading = (isLoading: boolean, message = '') => {
    loading.value = isLoading
    loadingMessage.value = message
  }

  const showNotification = (message: string, type: Notification['type'] = 'info') => {
    notification.value = { message, type }

    // Auto-clear after 5 seconds
    setTimeout(() => {
      if (notification.value?.message === message) {
        notification.value = null
      }
    }, 5000)
  }

  const clearNotification = () => {
    notification.value = null
  }

  const showSuccess = (message: string) => showNotification(message, 'success')
  const showError = (message: string) => showNotification(message, 'error')
  const showInfo = (message: string) => showNotification(message, 'info')

  return {
    // State
    loading,
    loadingMessage,
    notification,

    // Actions
    setLoading,
    showNotification,
    clearNotification,
    showSuccess,
    showError,
    showInfo,
  }
})