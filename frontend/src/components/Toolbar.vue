<template>
  <div class="toolbar flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <div v-if="subtitle" class="text-sm text-gray-500">
        {{ subtitle }}
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <slot name="actions" />

      <button
        v-if="showSave"
        @click="$emit('save')"
        :disabled="saving"
        class="btn-primary"
      >
        <div v-if="saving" class="flex items-center">
          <div class="spinner mr-2"></div>
          Saving...
        </div>
        <span v-else>Save</span>
      </button>

      <button
        v-if="showCancel"
        @click="$emit('cancel')"
        class="btn-secondary"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  showSave?: boolean
  showCancel?: boolean
  saving?: boolean
}

interface Emits {
  save: []
  cancel: []
}

withDefaults(defineProps<Props>(), {
  showSave: false,
  showCancel: false,
  saving: false,
})

defineEmits<Emits>()
</script>