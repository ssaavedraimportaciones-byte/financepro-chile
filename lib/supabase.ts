/**
 * Cliente híbrido para FinancePro Chile
 *
 * - auth  → Supabase (login, sesión, cookies)
 * - from  → Neon via /api/db/[table] (datos de negocio)
 *
 * NeonQueryBuilder replica la API de Supabase (.from().eq().select()...)
 * para que las 14 páginas del dashboard funcionen sin ningún cambio.
 */
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbResult = { data: any; error: { message: string } | null };

// ─────────────────────────────────────────────────────────────
// NeonQueryBuilder – traduce la API Supabase → fetch /api/db
// ─────────────────────────────────────────────────────────────

class NeonQueryBuilder implements PromiseLike<DbResult> {
  private _table: string;
  private _op: "get" | "post" | "patch" | "delete" = "get";
  private _filters = new URLSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _body: any = null;

  constructor(table: string) {
    this._table = table;
  }

  select(_cols?: string) {
    if (this._op !== "post" && this._op !== "patch" && this._op !== "delete") {
      this._op = "get";
    }
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(data: any) {
    this._op = "post";
    this._body = data;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(data: any) {
    this._op = "patch";
    this._body = data;
    return this;
  }

  delete() {
    this._op = "delete";
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsert(data: any, opts?: { onConflict?: string }) {
    this._op = "post";
    this._body = data;
    this._filters.set("_upsert", "1");
    if (opts?.onConflict) {
      this._filters.set("_conflict", opts.onConflict);
    }
    return this;
  }

  eq(col: string, val: unknown) {
    this._filters.append(col, `eq.${val}`);
    return this;
  }

  neq(col: string, val: unknown) {
    this._filters.append(col, `neq.${val}`);
    return this;
  }

  gte(col: string, val: unknown) {
    this._filters.append(col, `gte.${val}`);
    return this;
  }

  lte(col: string, val: unknown) {
    this._filters.append(col, `lte.${val}`);
    return this;
  }

  is(col: string, val: unknown) {
    this._filters.append(col, `is.${val}`);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? "desc" : "asc";
    this._filters.set("_order", `${col}.${dir}`);
    return this;
  }

  single() {
    this._filters.set("_single", "1");
    return this;
  }

  maybeSingle() {
    this._filters.set("_single", "1");
    return this;
  }

  private _execute(): Promise<DbResult> {
    const qs = this._filters.toString();
    const url = `/api/db/${this._table}${qs ? `?${qs}` : ""}`;

    const method =
      this._op === "post" ? "POST"
      : this._op === "patch" ? "PATCH"
      : this._op === "delete" ? "DELETE"
      : "GET";

    const init: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (this._body !== null && method !== "GET" && method !== "DELETE") {
      init.body = JSON.stringify(this._body);
    }

    return fetch(url, init)
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          return {
            data: null,
            error: {
              message:
                (json as { error?: string }).error ?? res.statusText,
            },
          };
        }
        const data = await res.json();
        return { data, error: null };
      })
      .catch((err: unknown) => ({
        data: null,
        error: {
          message: err instanceof Error ? err.message : String(err),
        },
      }));
  }

  /**
   * Implementa PromiseLike<DbResult> para que `await` y .then() funcionen.
   */
  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?:
      | ((value: DbResult) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
  ): Promise<TResult1 | TResult2> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this._execute().then(onfulfilled as any, onrejected as any);
  }
}

// ─────────────────────────────────────────────────────────────
// createClient: híbrido auth=Supabase | data=Neon via proxy
// ─────────────────────────────────────────────────────────────
export function createClient() {
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return {
    /** Autenticación: Supabase (getUser, signIn, signOut…) */
    auth: supabase.auth,
    /** Datos: proxy → /api/db/[table] (Neon PostgreSQL) */
    from: (table: string) => new NeonQueryBuilder(table),
  };
}
