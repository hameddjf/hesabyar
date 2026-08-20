export function toCamel(row) {
  if (!row || typeof row !== 'object') return row
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    const camelKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camelKey] = v
  }
  return out
}

export function formatToman(n) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('fa-IR')
}
