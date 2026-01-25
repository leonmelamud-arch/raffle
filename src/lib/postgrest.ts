/**
 * PostgREST Client
 * A lightweight REST client that mimics Supabase's query builder API
 * for easy migration from Supabase to PostgREST
 */

// Default to localhost:3001 for Docker development
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';

interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: string | number | boolean | null | (string | number)[];
}

interface QueryOptions {
  filters: QueryFilter[];
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  single?: boolean;
  select?: string;
}

class PostgrestQueryBuilder<T = Record<string, unknown>> {
  private table: string;
  private options: QueryOptions = { filters: [] };
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
  private body: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private returnData = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*'): this {
    this.options.select = columns;
    this.method = 'GET';
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this.method = 'POST';
    this.body = data;
    this.returnData = true;
    return this;
  }

  update(data: Record<string, unknown>): this {
    this.method = 'PATCH';
    this.body = data;
    this.returnData = true;
    return this;
  }

  delete(): this {
    this.method = 'DELETE';
    return this;
  }

  eq(column: string, value: string | number | boolean): this {
    this.options.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: string | number | boolean): this {
    this.options.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: string | number): this {
    this.options.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: string | number): this {
    this.options.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: string | number): this {
    this.options.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: string | number): this {
    this.options.filters.push({ column, operator: 'lte', value });
    return this;
  }

  like(column: string, value: string): this {
    this.options.filters.push({ column, operator: 'like', value });
    return this;
  }

  ilike(column: string, value: string): this {
    this.options.filters.push({ column, operator: 'ilike', value });
    return this;
  }

  is(column: string, value: null | boolean): this {
    this.options.filters.push({ column, operator: 'is', value });
    return this;
  }

  in(column: string, values: (string | number)[]): this {
    this.options.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.options.orderBy = {
      column,
      ascending: options?.ascending ?? true
    };
    return this;
  }

  limit(count: number): this {
    this.options.limit = count;
    return this;
  }

  single(): this {
    this.options.single = true;
    this.options.limit = 1;
    return this;
  }

  // Alias for chaining after insert/update to get the data back
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  returning(_columns: string = '*'): this {
    this.returnData = true;
    return this;
  }

  private buildUrl(): string {
    const url = new URL(`${API_URL}/${this.table}`);

    // Add select parameter
    if (this.options.select) {
      url.searchParams.set('select', this.options.select);
    }

    // Add filters
    for (const filter of this.options.filters) {
      let value: string;
      if (filter.operator === 'in' && Array.isArray(filter.value)) {
        value = `(${filter.value.join(',')})`;
      } else if (filter.value === null) {
        value = 'null';
      } else {
        value = String(filter.value);
      }
      url.searchParams.set(filter.column, `${filter.operator}.${value}`);
    }

    // Add order
    if (this.options.orderBy) {
      const direction = this.options.orderBy.ascending ? 'asc' : 'desc';
      url.searchParams.set('order', `${this.options.orderBy.column}.${direction}`);
    }

    // Add limit
    if (this.options.limit) {
      url.searchParams.set('limit', String(this.options.limit));
    }

    return url.toString();
  }

  async execute(): Promise<{ data: T[] | T | null; error: Error | null }> {
    try {
      const url = this.buildUrl();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      // For insert/update with return, add Prefer header
      if (this.returnData && (this.method === 'POST' || this.method === 'PATCH')) {
        headers['Prefer'] = 'return=representation';
      }

      const response = await fetch(url, {
        method: this.method,
        headers,
        body: this.body ? JSON.stringify(this.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PostgREST error: ${response.status} - ${errorText}`);
      }

      // Handle empty responses (e.g., DELETE without return)
      const text = await response.text();
      if (!text) {
        return { data: null, error: null };
      }

      const data = JSON.parse(text);

      // If single() was called, return first item or null
      if (this.options.single) {
        const result = Array.isArray(data) ? data[0] || null : data;
        return { data: result as T, error: null };
      }

      return { data: data as T[], error: null };
    } catch (error) {
      console.error('PostgREST query error:', error);
      return { data: null, error: error as Error };
    }
  }

  // Allow using then() for async/await pattern
  then<TResult1 = { data: T[] | T | null; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | T | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Main client object mimicking Supabase's structure
export const postgrest = {
  from<T = Record<string, unknown>>(table: string): PostgrestQueryBuilder<T> {
    return new PostgrestQueryBuilder<T>(table);
  }
};

// Also export as db for shorter usage
export const db = postgrest;

// Export the API URL for reference
export const getApiUrl = () => API_URL;
