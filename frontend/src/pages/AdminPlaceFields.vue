<template>
  <div class="min-h-screen bg-gray-50">
    <Toolbar
      :title="`Edit Fields: ${currentTemplate?.name || 'Loading...'}`"
      :subtitle="`${currentFields.length} fields configured`"
      :show-save="true"
      :show-cancel="true"
      :saving="saving"
      @save="saveTemplate"
      @cancel="$router.go(-1)"
    />

    <div class="flex h-screen pt-16">
      <!-- Left Sidebar -->
      <div class="w-80 bg-white border-r border-gray-200 p-4">
        <FieldPalette
          :selected-type="selectedFieldType"
          @select-field-type="selectedFieldType = $event"
        />

        <!-- Field Properties -->
        <div v-if="selectedField" class="mt-6 p-4 border-t border-gray-200">
          <h4 class="font-medium mb-3">Field Properties</h4>
          <div class="space-y-3">
            <div>
              <label class="form-label">Label</label>
              <input
                :value="selectedField.label"
                @input="updateSelectedField({ label: $event.target.value })"
                class="form-input"
              >
            </div>
            <div>
              <label class="form-label">Placeholder</label>
              <input
                :value="selectedField.placeholder"
                @input="updateSelectedField({ placeholder: $event.target.value })"
                class="form-input"
              >
            </div>
            <div class="flex items-center">
              <input
                type="checkbox"
                :checked="selectedField.required"
                @change="updateSelectedField({ required: $event.target.checked })"
                class="mr-2"
              >
              <label class="text-sm">Required field</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 p-4 overflow-auto">
        <div v-if="!pdfUrl" class="text-center py-12">
          <div class="spinner mx-auto mb-4"></div>
          <p>Loading PDF...</p>
        </div>

        <PdfCanvas
          v-if="pdfUrl"
          :pdf-url="pdfUrl"
          :fields="currentFields"
          :selected-field-id="selectedFieldId"
          @add-field="addField"
          @update-field="updateField"
          @select-field="selectField"
          @delete-field="removeField"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTemplatesStore } from '@/store/templates'
import { useAppStore } from '@/store/app'
import { api } from '@/lib/api'
import Toolbar from '@/components/Toolbar.vue'
import FieldPalette from '@/components/FieldPalette.vue'
import PdfCanvas from '@/components/PdfCanvas.vue'
import { FieldType, FieldDef } from '@grud-sign/shared'

const route = useRoute()
const router = useRouter()
const templatesStore = useTemplatesStore()
const appStore = useAppStore()

// State
const pdfUrl = ref('')
const selectedFieldType = ref<FieldType>('text')
const saving = ref(false)

// Computed
const templateId = computed(() => route.params.id as string)
const currentTemplate = computed(() => templatesStore.currentTemplate)
const currentFields = computed(() => templatesStore.currentFields)
const selectedFieldId = computed(() => templatesStore.selectedFieldId)
const selectedField = computed(() => templatesStore.selectedField)

// Methods
const loadTemplate = async () => {
  try {
    await templatesStore.loadTemplate(templateId.value)

    if (currentTemplate.value) {
      // Get PDF URL
      const response = await api.get(`/files/${currentTemplate.value.fileKey}`)
      pdfUrl.value = response.data.fileUrl
    }
  } catch (error) {
    appStore.showError('Failed to load template')
    router.push('/templates')
  }
}

const addField = (type: FieldType, x: number, y: number, page: number) => {
  templatesStore.addField(type, x, y, page)
}

const updateField = (fieldId: string, updates: Partial<FieldDef>) => {
  templatesStore.updateField(fieldId, updates)
}

const selectField = (fieldId: string | null) => {
  templatesStore.selectField(fieldId)
}

const removeField = (fieldId: string) => {
  templatesStore.removeField(fieldId)
}

const updateSelectedField = (updates: Partial<FieldDef>) => {
  if (selectedField.value) {
    templatesStore.updateField(selectedField.value.id, updates)
  }
}

const saveTemplate = async () => {
  try {
    saving.value = true
    await templatesStore.updateTemplate(templateId.value, currentFields.value)
    appStore.showSuccess('Template saved successfully')
  } catch (error) {
    // Error is handled in the store
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadTemplate()
})
</script>