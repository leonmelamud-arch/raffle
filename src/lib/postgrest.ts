/**
 * PostgREST Client for HypnoRaffle
 * Replaces Supabase client for local Docker deployment
 */

const POSTGREST_URL = process.env.NEXT_PUBLIC_POSTGREST_URL || 'http://localhost:3001';

interface PostgrestError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

interface PostgrestResponse<T> {
  data: T | null;
  error: PostgrestError | null;
  count?: number;
}

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';

interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: string | number | boolean | null | (string | number)[];
}

class PostgrestQueryBuilder<T> {
  private table: string;
  private selectColumns: string = '*';
  private filters: QueryFilter[] = [];
  private orderColumn?: string;
  private orderAscending: boolean = true;
  private limitCount?: number;
  private singleRow: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*'): this {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: string | number | boolean): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: string | number | boolean): this {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  is(column: string, value: null | boolean): this {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  in(column: string, values: (string | number)[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.singleRow = true;
    return this;
  }

  private buildUrl(): string {
    const url = new URL(`${POSTGREST_URL}/${this.table}`);
    
    // Add select
    url.searchParams.set('select', this.selectColumns);
    
    // Add filters
    for (const filter of this.filters) {
      if (filter.operator === 'in' && Array.isArray(filter.value)) {
        url.searchParams.set(filter.column, `in.(${filter.value.join(',')})`);
      } else if (filter.operator === 'is') {
        url.searchParams.set(filter.column, `is.${filter.value}`);
      } else {
        url.searchParams.set(filter.column, `${filter.operator}.${filter.value}`);
      }
    }
    
    // Add order
    if (this.orderColumn) {
      url.searchParams.set('order', `${this.orderColumn}.${this.orderAscending ? 'asc' : 'desc'}`);
    }
    
    // Add limit
    if (this.limitCount) {
      url.searchParams.set('limit', this.limitCount.toString());
    }
    
    return url.toString();
  }

  async then<TResult>(
    onfulfilled?: (value: PostgrestResponse<T[]>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as unknown as TResult;
  }

  private async execute(): Promise<PostgrestResponse<T[] | T | null>> {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      if (this.singleRow) {
        headers['Accept'] = 'application/vnd.pgrst.object+json';
      }

      const response = await fetch(this.buildUrl(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: '',
          hint: '',
          code: 'FETCH_ERROR',
        },
      };
    }
  }
}

class PostgrestInsertBuilder<T> {
  private table: string;
  private data: Partial<T> | Partial<T>[];
  private returnData: boolean = false;
  private selectColumns: string = '*';

  constructor(table: string, data: Partial<T> | Partial<T>[]) {
    this.table = table;
    this.data = data;
  }

  select(columns: string = '*'): this {
    this.returnData = true;
    this.selectColumns = columns;
    return this;
  }

  single(): this {
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: PostgrestResponse<T | T[] | null>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as unknown as TResult;
  }

  private async execute(): Promise<PostgrestResponse<T | T[] | null>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Prefer': this.returnData ? 'return=representation' : 'return=minimal',
      };

      const response = await fetch(`${POSTGREST_URL}/${this.table}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.data),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      if (this.returnData) {
        const data = await response.json();
        return { data, error: null };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: '',
          hint: '',
          code: 'FETCH_ERROR',
        },
      };
    }
  }
}

class PostgrestUpdateBuilder<T> {
  private table: string;
  private data: Partial<T>;
  private filters: QueryFilter[] = [];
  private returnData: boolean = false;

  constructor(table: string, data: Partial<T>) {
    this.table = table;
    this.data = data;
  }

  eq(column: string, value: string | number | boolean): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  select(): this {
    this.returnData = true;
    return this;
  }

  single(): this {
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: PostgrestResponse<T | null>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as unknown as TResult;
  }

  private buildUrl(): string {
    const url = new URL(`${POSTGREST_URL}/${this.table}`);
    for (const filter of this.filters) {
      url.searchParams.set(filter.column, `${filter.operator}.${filter.value}`);
    }
    return url.toString();
  }

  private async execute(): Promise<PostgrestResponse<T | null>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Prefer': this.returnData ? 'return=representation' : 'return=minimal',
      };

      const response = await fetch(this.buildUrl(), {
        method: 'PATCH',
        headers,
        body: JSON.stringify(this.data),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      if (this.returnData) {
        const data = await response.json();
        return { data: Array.isArray(data) ? data[0] : data, error: null };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: '',
          hint: '',
          code: 'FETCH_ERROR',
        },
      };
    }
  }
}

class PostgrestDeleteBuilder {
  private table: string;
  private filters: QueryFilter[] = [];

  constructor(table: string) {
    this.table = table;
  }

  eq(column: string, value: string | number | boolean): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: PostgrestResponse<null>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as unknown as TResult;
  }

  private buildUrl(): string {
    const url = new URL(`${POSTGREST_URL}/${this.table}`);
    for (const filter of this.filters) {
      url.searchParams.set(filter.column, `${filter.operator}.${filter.value}`);
    }
    return url.toString();
  }

  private async execute(): Promise<PostgrestResponse<null>> {
    try {
      const response = await fetch(this.buildUrl(), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: '',
          hint: '',
          code: 'FETCH_ERROR',
        },
      };
    }
  }
}

class PostgrestTableBuilder<T = unknown> {
  private table: string;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*'): PostgrestQueryBuilder<T> {
    return new PostgrestQueryBuilder<T>(this.table).select(columns);
  }

  insert(data: Partial<T> | Partial<T>[]): PostgrestInsertBuilder<T> {
    return new PostgrestInsertBuilder<T>(this.table, data);
  }

  update(data: Partial<T>): PostgrestUpdateBuilder<T> {
    return new PostgrestUpdateBuilder<T>(this.table, data);
  }

  delete(): PostgrestDeleteBuilder {
    return new PostgrestDeleteBuilder(this.table);
  }
}

class PostgrestClient {
  from<T = unknown>(table: string): PostgrestTableBuilder<T> {
    return new PostgrestTableBuilder<T>(table);
  }

  /**
   * Call a PostgreSQL function via RPC
   */
  async rpc<T = unknown>(
    functionName: string,
    params?: Record<string, unknown>
  ): Promise<PostgrestResponse<T>> {
    try {
      const response = await fetch(`${POSTGREST_URL}/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: params ? JSON.stringify(params) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: '',
          hint: '',
          code: 'FETCH_ERROR',
        },
      };
    }
  }
}

// Export singleton instance (similar to Supabase client)
export const postgrest = new PostgrestClient();

// Also export as 'db' for convenience
export const db = postgrest;

// Export types
export type { PostgrestResponse, PostgrestError };
