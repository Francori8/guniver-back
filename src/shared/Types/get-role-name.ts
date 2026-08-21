/**
 * El payload del JWT guarda `role` como el objeto Role completo, pero
 * distintas partes del código lo tratan como string a veces (ver
 * role.guard.ts). Este helper normaliza ambos casos.
 */
export function getRoleName(role: unknown): string | undefined {
  if (typeof role === 'object' && role !== null && 'name' in role) {
    return (role as { name: string }).name;
  }
  return typeof role === 'string' ? role : undefined;
}
