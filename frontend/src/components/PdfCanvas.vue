<template>
  <div class="pdf-canvas-container">
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="spinner"></div>
      <span class="ml-2">Loading PDF...</span>
    </div>

    <div v-else-if="error" class="text-red-600 p-4 border border-red-200 rounded-md">
      {{ error }}
    </div>

    <div v-else class="pdf-pages">
      <div
        v-for="page in pages"
        :key="page.pageNumber"
        class="pdf-page relative mb-8 shadow-lg"
        :style="{
          width: `${page.width}px`,
          height: `${page.height}px`,
        }"
        @click="handleCanvasClick($event, page.pageNumber)"
      >
        <!-- PDF page canvas -->
        <canvas
          :ref="`canvas-${page.pageNumber}`"
          :width="page.width"
          :height="page.height"
          class="pdf-canvas border border-gray-300"
        />

        <!-- Fields overlay -->
        <div class="fields-overlay absolute inset-0 pointer-events-none">
          <FieldBox
            v-for="field in getFieldsForPage(page.pageNumber)"
            :key="field.id"
            :field="field"
            :selected="selectedFieldId === field.id"
            :readonly="readonly"
            class="pointer-events-auto"
            @update="updateField"
            @select="selectField"
            @delete="deleteField"
          />
        </div>

        <!-- Page number -->
        <div class="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          Page {{ page.pageNumber }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { PDFRenderer, type PDFPage } from '@/lib/pdf'
import { FieldDef } from '@grud-sign/shared'
import FieldBox from './FieldBox.vue'

interface Props {
  pdfUrl?: string
  fields?: FieldDef[]
  selectedFieldId?: string | null
  readonly?: boolean
  onFieldAdd?: (type: FieldDef['type'], x: number, y: number, page: number) => void
}

interface Emits {
  updateField: [fieldId: string, updates: Partial<FieldDef>]
  selectField: [fieldId: string | null]
  deleteField: [fieldId: string]
  addField: [type: FieldDef['type'], x: number, y: number, page: number]
}

const props = withDefaults(defineProps<Props>(), {
  fields: () => [],
  selectedFieldId: null,
  readonly: false,
})

const emit = defineEmits<Emits>()

// State
const loading = ref(false)
const error = ref('')
const pages = ref<PDFPage[]>([])
const pdfRenderer = ref<PDFRenderer | null>(null)

// Computed
const getFieldsForPage = (pageNumber: number) => {
  return props.fields.filter(field => field.page === pageNumber - 1) // Convert to 0-based
}

// Methods
const loadPDF = async () => {
  if (!props.pdfUrl) return

  try {
    loading.value = true
    error.value = ''

    pdfRenderer.value = new PDFRenderer()
    await pdfRenderer.value.loadFromUrl(props.pdfUrl)

    const renderedPages = await pdfRenderer.value.renderAllPages(1.5)
    pages.value = renderedPages

    // Draw pages on canvas elements
    await nextTick()
    for (const page of renderedPages) {
      const canvasRef = `canvas-${page.pageNumber}`
      const canvasEl = document.querySelector(`[ref="${canvasRef}"]`) as HTMLCanvasElement
      if (canvasEl) {
        const ctx = canvasEl.getContext('2d')!
        ctx.drawImage(page.canvas, 0, 0)
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load PDF'
    console.error('PDF loading error:', err)
  } finally {
    loading.value = false
  }
}

const handleCanvasClick = (event: MouseEvent, pageNumber: number) => {
  if (props.readonly || !props.onFieldAdd) return

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // For now, default to text field. In a real app, this would be based on selected tool
  emit('addField', 'text', x, y, pageNumber - 1) // Convert to 0-based
}

const updateField = (fieldId: string, updates: Partial<FieldDef>) => {
  emit('updateField', fieldId, updates)
}

const selectField = (fieldId: string | null) => {
  emit('selectField', fieldId)
}

const deleteField = (fieldId: string) => {
  emit('deleteField', fieldId)
}

// Lifecycle
onMounted(() => {
  if (props.pdfUrl) {
    loadPDF()
  }
})

watch(() => props.pdfUrl, (newUrl) => {
  if (newUrl) {
    loadPDF()
  }
})
</script>