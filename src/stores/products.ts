import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Product } from '@/lib/types'

// Katalog produktů (pro POS a sklad). Naplní useProducts().load().
export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  return { products }
})
