export function tenantScope(tenantId: string) {
  return { tenantId, deletedAt: null };
}

export function scopedIdWhere(tenantId: string, id: string) {
  return { id, ...tenantScope(tenantId) };
}

export function activeOnly() {
  return { deletedAt: null };
}

export function softDeleteData() {
  return { deletedAt: new Date() };
}
