function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Supabase/Postgres always returns snake_case column names (user_id, start_at, ...);
// the app's types are camelCase. This converts recursively so nested selects
// (e.g. votes.select('*, options:vote_options(*)')) come out fully mapped too.
export function camelizeDeep<T>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((v) => camelizeDeep(v)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[snakeToCamel(key)] = camelizeDeep(value);
    }
    return out as T;
  }
  return input as T;
}
