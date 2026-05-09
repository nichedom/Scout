/** Strip whitespace and wrapping quotes — common .env mistake: KEY="…" */
export function normalizeGoogleMapsApiKey(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/^["']|["']$/g, '');
}
