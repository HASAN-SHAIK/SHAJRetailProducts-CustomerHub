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
  suppliers: ({ search = '', page = 1, limit = 50, sortBy = 'name', sortOrder = 'asc' } = {}) => centralApi.get('/v1/suppliers', {
    params: { search: search || undefined, page, limit, sort_by: sortBy, sort_order: sortOrder },
  }),
  supplier: (supplierId) => centralApi.get(`/v1/suppliers/${encodeURIComponent(String(supplierId))}`),
  createSupplier: (payload) => centralApi.post('/v1/suppliers', payload),
  updateSupplier: (supplierId, payload) => centralApi.put(`/v1/suppliers/${encodeURIComponent(String(supplierId))}`, payload),
  deleteSupplier: (supplierId) => centralApi.delete(`/v1/suppliers/${encodeURIComponent(String(supplierId))}`),
  purchases: ({ branchId = '', supplierId = '', startDate = '', endDate = '', page = 1, limit = 50 } = {}) => centralApi.get('/v1/purchases', {
    params: { branch_id: branchId || undefined, supplier_id: supplierId || undefined, start_date: startDate || undefined, end_date: endDate || undefined, page, limit },
  }),
  purchase: (purchaseId) => centralApi.get(`/v1/purchases/${encodeURIComponent(String(purchaseId))}`),
  createPurchase: (payload) => centralApi.post('/v1/purchases', payload),
  purchaseReturns: ({ branchId = '', supplierId = '', purchaseId = '', limit = 100 } = {}) => centralApi.get('/v1/purchase-returns', {
    params: { branch_id: branchId || undefined, supplier_id: supplierId || undefined, purchase_id: purchaseId || undefined, limit },
  }),
  createPurchaseReturn: (payload) => centralApi.post('/v1/purchase-returns', payload),
  batches: ({ branchId = '' } = {}) => centralApi.get('/batches', {
    params: { branch_id: branchId || undefined },
  }),
  branchStock: ({ productId, branchId = '' } = {}) => centralApi.get('/stock', {
    params: { product_id: productId, branch_id: branchId || undefined },
  }),
  adjustStock: (payload) => centralApi.post('/stock/adjustments', payload),
};
