<template>
  <div class="field-palette bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-semibold mb-4">Field Types</h3>

    <div class="space-y-2">
      <button
        v-for="fieldType in fieldTypes"
        :key="fieldType.type"
        @click="$emit('selectFieldType', fieldType.type)"
        :class="[
          'w-full text-left p-3 rounded-md border-2 transition-colors',
          selectedType === fieldType.type
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300'
        ]"
      >
        <div class="flex items-center space-x-3">
          <span class="text-2xl">{{ fieldType.icon }}</span>
          <div>
            <div class="font-medium">{{ fieldType.label }}</div>
            <div class="text-sm text-gray-500">{{ fieldType.description }}</div>
          </div>
        </div>
      </button>
    </div>

    <div class="mt-6 pt-4 border-t border-gray-200">
      <h4 class="font-medium mb-2">Instructions</h4>
      <p class="text-sm text-gray-600">
        1. Select a field type above<br>
        2. Click on the PDF where you want to place the field<br>
        3. Adjust size and properties as needed
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FieldType } from '@grud-sign/shared'

interface Props {
  selectedType?: FieldType | null
}

interface Emits {
  selectFieldType: [type: FieldType]
}

defineProps<Props>()
defineEmits<Emits>()

const fieldTypes = [
  {
    type: 'signature' as FieldType,
    label: 'Signature',
    description: 'Digital signature field',
    icon: '✍️'
  },
  {
    type: 'text' as FieldType,
    label: 'Text',
    description: 'Text input field',
    icon: '📝'
  },
  {
    type: 'date' as FieldType,
    label: 'Date',
    description: 'Date input field',
    icon: '📅'
  }
]
</script>