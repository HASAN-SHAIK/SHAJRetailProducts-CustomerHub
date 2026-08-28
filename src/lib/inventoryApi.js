import { centralApi } from './api';

export const inventoryApi = {
  products: ({ branchId = '', search = '', category = '', page = 1, limit = 25, sortBy = 'created_at', sortOrder = 'desc' } = {}) => centralApi.get('/v1/products', {
    params: {
      branch_id: branchId || undefined,
      search: search || undefined,
      category: category || undefined,
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
  }),
  product: (productId) => centralApi.get(`/v1/products/${encodeURIComponent(String(productId))}`),
  createProduct: (payload) => centralApi.post('/v1/products', payload),
  updateProduct: (productId, payload) => centralApi.put(`/v1/products/${encodeURIComponent(String(productId))}`, payload),
  deleteProduct: (productId) => centralApi.delete(`/v1/products/${encodeURIComponent(String(productId))}`),
  categories: ({ search = '', page = 1, limit = 200 } = {}) => centralApi.get('/v1/categories', {
    params: { search: search || undefined, page, limit },
  }),
};
