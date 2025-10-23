import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Template, FieldDef } from '@grud-sign/shared'
import { api } from '@/lib/api'
import { useAppStore } from './app'

export const useTemplatesStore = defineStore('templates', () => {
  const appStore = useAppStore()

  // State
  const templates = ref<Template[]>([])
  const currentTemplate = ref<Template | null>(null)
  const currentFields = ref<FieldDef[]>([])
  const selectedFieldId = ref<string | null>(null)

  // Computed
  const selectedField = computed(() => {
    if (!selectedFieldId.value) return null
    return currentFields.value.find(f => f.id === selectedFieldId.value) || null
  })

  // Actions
  const loadTemplates = async () => {
    try {
      appStore.setLoading(true, 'Loading templates...')
      const response = await api.get('/templates')
      templates.value = response.data.templates
    } catch (error: any) {
      appStore.showError(error.response?.data?.message || 'Failed to load templates')
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  const loadTemplate = async (templateId: string) => {
    try {
      appStore.setLoading(true, 'Loading template...')
      const response = await api.get(`/templates/${templateId}`)
      currentTemplate.value = response.data.template
      currentFields.value = [...response.data.template.fields]
      return response.data.template
    } catch (error: any) {
      appStore.showError(error.response?.data?.message || 'Failed to load template')
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  const createTemplate = async (name: string, fileId: string, fields: FieldDef[] = []) => {
    try {
      appStore.setLoading(true, 'Creating template...')
      const response = await api.post('/templates', {
        name,
        fileId,
        fields,
      })

      // Reload templates to get the latest list
      await loadTemplates()

      appStore.showSuccess('Template created successfully')
      return response.data.templateId
    } catch (error: any) {
      appStore.showError(error.response?.data?.message || 'Failed to create template')
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  const updateTemplate = async (templateId: string, fields: FieldDef[]) => {
    try {
      appStore.setLoading(true, 'Updating template...')

      // For now, we create a new template with updated fields
      // In a real app, you'd have an update endpoint
      if (!currentTemplate.value) throw new Error('No current template')

      await api.post('/templates', {
        name: currentTemplate.value.name + ' (Updated)',
        fileId: currentTemplate.value.fileKey,
        fields,
      })

      appStore.showSuccess('Template updated successfully')
      await loadTemplates()
    } catch (error: any) {
      appStore.showError(error.response?.data?.message || 'Failed to update template')
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  const addField = (type: FieldDef['type'], x: number, y: number, page: number) => {
    const fieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Default field sizes
    const defaultSizes = {
      signature: { width: 200, height: 50 },
      text: { width: 150, height: 30 },
      date: { width: 100, height: 30 },
    }
    const size = defaultSizes[type]

    const newField: FieldDef = {
      id: fieldId,
      type,
      x,
      y,
      width: size.width,
      height: size.height,
      page,
      required: true,
      placeholder: type === 'date' ? 'MM/DD/YYYY' : `Enter ${type}`,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
    }

    currentFields.value.push(newField)
    selectedFieldId.value = fieldId
  }

  const updateField = (fieldId: string, updates: Partial<FieldDef>) => {
    const index = currentFields.value.findIndex(f => f.id === fieldId)
    if (index >= 0) {
      currentFields.value[index] = { ...currentFields.value[index], ...updates }
    }
  }

  const removeField = (fieldId: string) => {
    const index = currentFields.value.findIndex(f => f.id === fieldId)
    if (index >= 0) {
      currentFields.value.splice(index, 1)
      if (selectedFieldId.value === fieldId) {
        selectedFieldId.value = null
      }
    }
  }

  const selectField = (fieldId: string | null) => {
    selectedFieldId.value = fieldId
  }

  const clearCurrentTemplate = () => {
    currentTemplate.value = null
    currentFields.value = []
    selectedFieldId.value = null
  }

  return {
    // State
    templates,
    currentTemplate,
    currentFields,
    selectedFieldId,

    // Computed
    selectedField,

    // Actions
    loadTemplates,
    loadTemplate,
    createTemplate,
    updateTemplate,
    addField,
    updateField,
    removeField,
    selectField,
    clearCurrentTemplate,
  }
})