<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto p-6">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h1 class="text-2xl font-bold mb-2">Document Signature Required</h1>
        <p class="text-gray-600" v-if="template">
          Please review and sign: <strong>{{ template.name }}</strong>
        </p>
        <div v-if="expiresAt" class="text-sm text-orange-600 mt-2">
          This link expires on {{ new Date(expiresAt).toLocaleDateString() }}
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="spinner mx-auto mb-4"></div>
        <p>Loading document...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div class="text-red-500 text-4xl mb-4">❌</div>
        <h2 class="text-xl font-semibold text-red-800 mb-2">Unable to Load Document</h2>
        <p class="text-red-600">{{ error }}</p>
      </div>

      <!-- Signing Interface -->
      <div v-else-if="template && !submitted" class="space-y-6">
        <!-- PDF Viewer with Fields -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4">Document Preview</h3>
          <PdfCanvas
            :pdf-url="pdfUrl"
            :fields="template.fields"
            :readonly="true"
          />
        </div>

        <!-- Signature Form -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4">Required Fields</h3>

          <div class="space-y-4">
            <div
              v-for="field in requiredFields"
              :key="field.id"
              class="space-y-2"
            >
              <label class="form-label">
                {{ field.label || `${field.type} field` }}
                <span v-if="field.required" class="text-red-500">*</span>
              </label>

              <input
                v-if="field.type === 'text'"
                v-model="fieldValues[field.id]"
                type="text"
                :placeholder="field.placeholder"
                :required="field.required"
                class="form-input"
              >

              <input
                v-else-if="field.type === 'date'"
                v-model="fieldValues[field.id]"
                type="date"
                :required="field.required"
                class="form-input"
              >

              <div v-else-if="field.type === 'signature'" class="space-y-2">
                <input
                  v-model="fieldValues[field.id]"
                  type="text"
                  placeholder="Type your full name"
                  :required="field.required"
                  class="form-input"
                >
                <p class="text-xs text-gray-500">
                  By typing your name, you agree this constitutes your electronic signature
                </p>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end space-x-4">
            <button
              @click="submitSigning"
              :disabled="!canSubmit || submitting"
              class="btn-primary"
            >
              <div v-if="submitting" class="flex items-center">
                <div class="spinner mr-2"></div>
                Processing...
              </div>
              <span v-else>Complete Signature</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="submitted" class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div class="text-green-500 text-4xl mb-4">✅</div>
        <h2 class="text-xl font-semibold text-green-800 mb-2">Document Signed Successfully</h2>
        <p class="text-green-600 mb-4">Your signed document is ready for download.</p>

        <div class="flex justify-center space-x-4">
          <a
            :href="signedDocumentUrl"
            download
            class="btn-primary"
          >
            Download Signed Document
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/store/app'
import { getSigningSession, submitSigning as apiSubmitSigning } from '@/lib/api'
import PdfCanvas from '@/components/PdfCanvas.vue'
import { Template, FieldValue } from '@grud-sign/shared'

const route = useRoute()
const appStore = useAppStore()

// State
const loading = ref(true)
const error = ref('')
const template = ref<Template | null>(null)
const pdfUrl = ref('')
const expiresAt = ref('')
const fieldValues = ref<Record<string, string>>({})
const submitting = ref(false)
const submitted = ref(false)
const signedDocumentUrl = ref('')

// Computed
const token = computed(() => route.params.token as string)

const requiredFields = computed(() => {
  return template.value?.fields.filter(field => field.required) || []
})

const canSubmit = computed(() => {
  return requiredFields.value.every(field => {
    const value = fieldValues.value[field.id]
    return value && value.trim().length > 0
  })
})

// Methods
const loadSigningSession = async () => {
  try {
    loading.value = true
    error.value = ''

    const session = await getSigningSession(token.value)
    template.value = session.template
    pdfUrl.value = session.fileUrl
    expiresAt.value = session.expiresAt

    // Initialize field values
    template.value.fields.forEach(field => {
      fieldValues.value[field.id] = ''
    })

  } catch (err: any) {
    if (err.response?.status === 404) {
      error.value = 'Sign link not found or has expired'
    } else if (err.response?.status === 410) {
      error.value = err.response.data.message || 'Sign link is no longer valid'
    } else {
      error.value = 'Failed to load signing session'
    }
  } finally {
    loading.value = false
  }
}

const submitSigning = async () => {
  if (!canSubmit.value || !template.value) return

  try {
    submitting.value = true

    // Prepare field values
    const filled: FieldValue[] = requiredFields.value.map(field => ({
      fieldId: field.id,
      value: fieldValues.value[field.id],
      type: field.type,
    }))

    const result = await apiSubmitSigning(token.value, filled)
    signedDocumentUrl.value = result.signedFileUrl
    submitted.value = true

    appStore.showSuccess('Document signed successfully!')

  } catch (err: any) {
    appStore.showError(err.response?.data?.message || 'Failed to submit signature')
  } finally {
    submitting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadSigningSession()
})
</script>