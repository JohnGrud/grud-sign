<template>
  <div
    :class="[
      'field-box',
      field.type,
      { selected: selected }
    ]"
    :style="{
      left: `${field.x}px`,
      top: `${field.y}px`,
      width: `${field.width}px`,
      height: `${field.height}px`,
    }"
    @click.stop="$emit('select', field.id)"
  >
    <div class="field-content p-1 text-xs">
      <div class="field-label font-medium">
        {{ field.label || `${field.type} field` }}
      </div>
      <div v-if="field.required" class="text-red-500">*</div>
    </div>

    <!-- Resize handles (only show when selected and not readonly) -->
    <div v-if="selected && !readonly" class="resize-handles">
      <div class="resize-handle bottom-right" @mousedown="startResize"></div>
    </div>

    <!-- Delete button -->
    <button
      v-if="selected && !readonly"
      @click.stop="$emit('delete', field.id)"
      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
import { FieldDef } from '@grud-sign/shared'

interface Props {
  field: FieldDef
  selected: boolean
  readonly?: boolean
}

interface Emits {
  update: [fieldId: string, updates: Partial<FieldDef>]
  select: [fieldId: string]
  delete: [fieldId: string]
}

defineProps<Props>()
defineEmits<Emits>()

const startResize = (event: MouseEvent) => {
  // Basic resize implementation - would be enhanced in production
  event.preventDefault()
  // Resize logic would go here
}
</script>

<style scoped>
.resize-handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  pointer-events: auto;
  background: #3b82f6;
  cursor: se-resize;
}

.bottom-right {
  bottom: -3px;
  right: -3px;
  width: 6px;
  height: 6px;
}
</style>