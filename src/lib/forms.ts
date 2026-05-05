export function textValue(formData: FormData, key: string, required = true) {
  const value = String(formData.get(key) || "").trim();
  if (required && !value) throw new Error(`${key} is required`);
  return value || null;
}

export function numberValue(formData: FormData, key: string, fallback = 0) {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return value;
}

export function dateValue(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) throw new Error(`${key} is required`);
  return new Date(raw);
}

export function optionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}
