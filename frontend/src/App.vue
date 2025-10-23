<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <router-link to="/" class="flex-shrink-0">
              <h1 class="text-xl font-bold text-gray-900">
                📝 GrudSign
              </h1>
            </router-link>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <router-link
                to="/upload"
                class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                active-class="text-primary-600 border-b-2 border-primary-600"
              >
                Upload
              </router-link>
              <router-link
                to="/templates"
                class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                active-class="text-primary-600 border-b-2 border-primary-600"
              >
                Templates
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main>
      <router-view />
    </main>

    <!-- Global loading overlay -->
    <div v-if="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
        <div class="spinner"></div>
        <span class="text-gray-700">{{ loadingMessage || 'Loading...' }}</span>
      </div>
    </div>

    <!-- Global notification -->
    <div
      v-if="notification"
      class="fixed top-4 right-4 z-50 max-w-sm w-full"
    >
      <div
        :class="[
          'rounded-lg p-4 shadow-lg',
          notification.type === 'success' ? 'bg-green-100 text-green-800' : '',
          notification.type === 'error' ? 'bg-red-100 text-red-800' : '',
          notification.type === 'info' ? 'bg-blue-100 text-blue-800' : '',
        ]"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <span
              :class="[
                'flex-shrink-0 mr-2',
                notification.type === 'success' ? 'text-green-500' : '',
                notification.type === 'error' ? 'text-red-500' : '',
                notification.type === 'info' ? 'text-blue-500' : '',
              ]"
            >
              <svg v-if="notification.type === 'success'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg v-else-if="notification.type === 'error'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </span>
            <p class="text-sm font-medium">{{ notification.message }}</p>
          </div>
          <button @click="clearNotification" class="ml-4 text-gray-400 hover:text-gray-600">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/store/app'
import { storeToRefs } from 'pinia'

const appStore = useAppStore()
const { loading, loadingMessage, notification } = storeToRefs(appStore)

const clearNotification = () => {
  appStore.clearNotification()
}
</script>