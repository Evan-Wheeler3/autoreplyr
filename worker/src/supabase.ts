import type { Env } from './types'

export class SupabaseClient {
  private url: string
  private key: string

  constructor(env: Env) {
    this.url = env.SUPABASE_URL
    this.key = env.SUPABASE_SERVICE_ROLE_KEY
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
    }
  }

  async select<T>(
    table: string,
    query: Record<string, string>,
    columns = '*'
  ): Promise<T | null> {
    const params = new URLSearchParams({ select: columns, ...query })
    const res = await fetch(`${this.url}/rest/v1/${table}?${params}`, {
      headers: this.headers(),
    })
    if (!res.ok) return null
    const rows = await res.json() as T[]
    return rows[0] ?? null
  }

  async selectMany<T>(
    table: string,
    query: Record<string, string>,
    columns = '*'
  ): Promise<T[]> {
    const params = new URLSearchParams({ select: columns, ...query })
    const res = await fetch(`${this.url}/rest/v1/${table}?${params}`, {
      headers: this.headers(),
    })
    if (!res.ok) return []
    return res.json() as Promise<T[]>
  }

  async insert<T>(table: string, data: Record<string, unknown>): Promise<T | null> {
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this.headers(), Prefer: 'return=representation' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    const rows = await res.json() as T[]
    return rows[0] ?? null
  }

  async update(
    table: string,
    query: Record<string, string>,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const params = new URLSearchParams(query)
    const res = await fetch(`${this.url}/rest/v1/${table}?${params}`, {
      method: 'PATCH',
      headers: { ...this.headers(), Prefer: 'return=minimal' },
      body: JSON.stringify(data),
    })
    return res.ok
  }

  async logError(
    context: string,
    error: unknown,
    clientId?: string,
    leadId?: string
  ): Promise<void> {
    try {
      await this.insert('errors', {
        client_id: clientId ?? null,
        lead_id: leadId ?? null,
        context,
        error_message: error instanceof Error ? error.message : String(error),
      })
    } catch {
      // Best effort — never throw from error logging
    }
  }
}
