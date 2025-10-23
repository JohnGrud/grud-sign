/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue-draggable-resizable' {
  import { DefineComponent } from 'vue'
  const VueDraggableResizable: DefineComponent<any, any, any>
  export default VueDraggableResizable
}