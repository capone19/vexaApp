/** Clave de React Query para la fila `tenants` (created_at, plan) — compartida entre hooks. */
export function getTenantRowQueryKey(tenantId: string) {
  return ['tenant', 'row', tenantId] as const;
}
