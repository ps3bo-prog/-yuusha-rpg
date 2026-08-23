// REAL v19 backend client.
// API keys must stay on your server, never in this browser file.
export class BackendClient {
  constructor(baseUrl = '') { this.baseUrl = baseUrl; }
  async health() {
    if (!this.baseUrl) return { ok: false, reason: 'not-configured' };
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'health', game: 'yuusha-v19' })
    });
    return { ok: response.ok, status: response.status };
  }
}
