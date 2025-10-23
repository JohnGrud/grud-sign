import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/upload'
    },
    {
      path: '/upload',
      name: 'AdminUpload',
      component: () => import('@/pages/AdminUpload.vue')
    },
    {
      path: '/templates',
      name: 'AdminTemplates',
      component: () => import('@/pages/AdminTemplates.vue')
    },
    {
      path: '/templates/:id/fields',
      name: 'AdminPlaceFields',
      component: () => import('@/pages/AdminPlaceFields.vue'),
      props: true
    },
    {
      path: '/sign/:token',
      name: 'Signer',
      component: () => import('@/pages/Signer.vue'),
      props: true
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/pages/NotFound.vue')
    }
  ]
})

export { router }