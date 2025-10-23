<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow p-6">
      <h1 class="text-2xl font-bold mb-6">Upload PDF Document</h1>

      <div v-if="!uploadedFile" class="space-y-6">
        <!-- File Upload -->
        <div>
          <label class="form-label">
            Select PDF File
          </label>
          <div
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
            ]"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".pdf,application/pdf"
              @change="handleFileSelect"
              class="hidden"
            >

            <div class="space-y-4">
              <div class="text-4xl">📄</div>
              <div>
                <p class="text-lg font-medium">Drop your PDF here</p>
                <p class="text-sm text-gray-500">or</p>
                <button
                  @click="$refs.fileInput.click()"
                  class="btn-primary mt-2"
                >
                  Browse Files
                </button>
              </div>
              <p class="text-xs text-gray-400">
                Maximum file size: 10MB | PDF files only
              </p>
            </div>
          </div>

          <div v-if="fileError" class="mt-2 text-red-600 text-sm">
            {{ fileError }}
          </div>
        </div>

        <!-- Template Name -->
        <div>
          <label class="form-label">
            Template Name
          </label>
          <input
            v-model="templateName"
            type="text"
            placeholder="Enter a name for this template"
            class="form-input"
            required
          >
        </div>

        <!-- Upload Button -->
        <div class="flex justify-end">
          <button
            @click="uploadAndCreateTemplate"
            :disabled="!selectedFile || !templateName || uploading"
            class="btn-primary"
          >
            <div v-if="uploading" class="flex items-center">
              <div class="spinner mr-2"></div>
              Uploading...
            </div>
            <span v-else>Upload & Create Template</span>
          </button>
        </div>
      </div>

      <!-- Success State -->
      <div v-else class="text-center space-y-4">
        <div class="text-green-600 text-4xl">✅</div>
        <h2 class="text-xl font-semibold">PDF Uploaded Successfully!</h2>
        <p class="text-gray-600">
          Your PDF has been uploaded and a template has been created.
        </p>

        <div class="flex justify-center space-x-4">
          <router-link
            :to="`/templates/${uploadedTemplateId}/fields`"
            class="btn-primary"
          >
            Add Signature Fields
          </router-link>
          <router-link to="/templates" class="btn-secondary">
            View All Templates
          </router-link>
          <button @click="resetForm" class="btn-secondary">
            Upload Another
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadFile } from '@/lib/api'
import { useTemplatesStore } from '@/store/templates'
import { useAppStore } from '@/store/app'

const router = useRouter()
const templatesStore = useTemplatesStore()
const appStore = useAppStore()

// State
const selectedFile = ref<File | null>(null)
const templateName = ref('')
const fileError = ref('')
const isDragging = ref(false)
const uploading = ref(false)
const uploadedFile = ref(false)
const uploadedTemplateId = ref('')

// Methods
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectFile(target.files[0])
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false

  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    selectFile(event.dataTransfer.files[0])
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

const selectFile = (file: File) => {
  fileError.value = ''

  // Validate file type
  if (!file.type.includes('pdf')) {
    fileError.value = 'Please select a PDF file'
    return
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    fileError.value = 'File size must be less than 10MB'
    return
  }

  selectedFile.value = file

  // Auto-generate template name from filename
  if (!templateName.value) {
    templateName.value = file.name.replace('.pdf', '')
  }
}

const uploadAndCreateTemplate = async () => {
  if (!selectedFile.value || !templateName.value) return

  try {
    uploading.value = true

    // Upload file
    const uploadResult = await uploadFile(selectedFile.value)

    // Create template
    const templateId = await templatesStore.createTemplate(
      templateName.value,
      uploadResult.fileId
    )

    uploadedFile.value = true
    uploadedTemplateId.value = templateId

  } catch (error: any) {
    appStore.showError(error.response?.data?.message || 'Upload failed')
  } finally {
    uploading.value = false
  }
}

const resetForm = () => {
  selectedFile.value = null
  templateName.value = ''
  fileError.value = ''
  uploadedFile.value = false
  uploadedTemplateId.value = ''
}
</script>