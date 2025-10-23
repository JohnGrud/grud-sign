<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Templates</h1>
      <router-link to="/upload" class="btn-primary">
        + Upload New PDF
      </router-link>
    </div>

    <div v-if="templatesStore.templates.length === 0" class="text-center py-12">
      <div class="text-gray-400 text-4xl mb-4">📄</div>
      <h2 class="text-xl font-semibold text-gray-600 mb-2">No Templates Yet</h2>
      <p class="text-gray-500 mb-4">Upload your first PDF to get started</p>
      <router-link to="/upload" class="btn-primary">
        Upload PDF
      </router-link>
    </div>

    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="template in templatesStore.templates"
        :key="template.templateId"
        class="bg-white rounded-lg shadow border border-gray-200 p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="text-2xl">📄</div>
          <div class="text-xs text-gray-500">
            {{ new Date(template.createdAt).toLocaleDateString() }}
          </div>
        </div>

        <h3 class="font-semibold text-lg mb-2">{{ template.name }}</h3>
        <p class="text-sm text-gray-600 mb-4">
          {{ template.fields?.length || 0 }} fields configured
        </p>

        <div class="flex space-x-2">
          <router-link
            :to="`/templates/${template.templateId}/fields`"
            class="btn-primary text-sm flex-1 text-center"
          >
            Edit Fields
          </router-link>
          <button
            @click="generateSignLink(template.templateId)"
            class="btn-secondary text-sm flex-1"
          >
            Generate Link
          </button>
        </div>
      </div>
    </div>

    <!-- Sign Link Modal -->
    <div
      v-if="showSignLinkModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Sign Link Generated</h3>

        <div class="mb-4">
          <label class="form-label">Signing URL</label>
          <div class="flex">
            <input
              :value="generatedSignUrl"
              readonly
              class="form-input flex-1 mr-2"
            >
            <button
              @click="copyToClipboard"
              class="btn-secondary"
            >
              Copy
            </button>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label">Signer Email (Optional)</label>
          <input
            v-model="signerEmail"
            type="email"
            placeholder="Enter signer's email"
            class="form-input"
          >
        </div>

        <div class="flex justify-end space-x-2">
          <button @click="closeSignLinkModal" class="btn-secondary">
            Close
          </button>
          <button @click="sendSignLink" class="btn-primary">
            Send Link
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTemplatesStore } from '@/store/templates'
import { useAppStore } from '@/store/app'
import { createSignLink } from '@/lib/api'

const templatesStore = useTemplatesStore()
const appStore = useAppStore()

// State
const showSignLinkModal = ref(false)
const generatedSignUrl = ref('')
const signerEmail = ref('')

// Methods
const generateSignLink = async (templateId: string) => {
  try {
    const result = await createSignLink(templateId)
    generatedSignUrl.value = result.signUrl
    showSignLinkModal.value = true
  } catch (error: any) {
    appStore.showError(error.response?.data?.message || 'Failed to generate sign link')
  }
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generatedSignUrl.value)
    appStore.showSuccess('Link copied to clipboard')
  } catch (error) {
    appStore.showError('Failed to copy to clipboard')
  }
}

const sendSignLink = async () => {
  if (signerEmail.value) {
    // In a real app, you'd send the email here
    appStore.showInfo('Email sending would be implemented here')
  }
  closeSignLinkModal()
}

const closeSignLinkModal = () => {
  showSignLinkModal.value = false
  generatedSignUrl.value = ''
  signerEmail.value = ''
}

// Lifecycle
onMounted(() => {
  templatesStore.loadTemplates()
})
</script>