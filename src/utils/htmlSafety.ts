export function escapeExportData<T>(value:T):T {
  if(typeof value==='string')return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)) as T;
  if(Array.isArray(value))return value.map(escapeExportData) as T;
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,escapeExportData(item)])) as T;
  return value;
}
