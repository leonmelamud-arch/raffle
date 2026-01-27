/**
 * Database Client for HypnoRaffle
 * Uses Supabase as primary with PostgREST as backup
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { postgrest, PostgrestResponse } from './postgrest';

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Create Supabase client if configured
let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}

// Database backend type
type DatabaseBackend = 'supabase' | 'postgrest';

// Check if PostgREST is configured (only use in Docker/local deployment)
const POSTGREST_URL = process.env.NEXT_PUBLIC_POSTGREST_URL || '';
const isPostgrestConfigured = !!(POSTGREST_URL && !POSTGREST_URL.includes('localhost'));

// Get current active backend
export function getActiveBackend(): DatabaseBackend {
  return isSupabaseConfigured ? 'supabase' : 'postgrest';
}

// Should we fallback to PostgREST on Supabase errors?
// Only use fallback if PostgREST is explicitly configured (not localhost)
const shouldUseFallback = isPostgrestConfigured;

/**
 * Wrapper class that provides Supabase-first access with PostgREST fallback
 */
class DatabaseClient {
  private useSupabase: boolean;
  private supabase: SupabaseClient | null;

  constructor() {
    this.useSupabase = isSupabaseConfigured;
    this.supabase = supabaseClient;
    
    if (this.useSupabase) {
      console.log('[DB] Using Supabase as primary database');
    } else {
      console.log('[DB] Supabase not configured, using PostgREST');
    }
  }

  /**
   * Access a table - returns Supabase query builder if available, otherwise PostgREST
   */
  from<T = unknown>(table: string) {
    if (this.useSupabase && this.supabase) {
      return new FallbackTableBuilder<T>(table, this.supabase, postgrest);
    }
    return postgrest.from<T>(table);
  }

  /**
   * Call a stored procedure (RPC)
   */
  async rpc<T = unknown>(
    functionName: string,
    params?: Record<string, unknown>
  ): Promise<PostgrestResponse<T>> {
    if (this.useSupabase && this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc(functionName, params);
        if (error) {
          console.error(`[DB] Supabase RPC failed: ${error.message}`);
          if (shouldUseFallback) {
            console.warn(`[DB] Falling back to PostgREST`);
            return postgrest.rpc<T>(functionName, params);
          }
          return { data: null, error: { message: error.message, details: '', hint: '', code: error.code || 'RPC_ERROR' } };
        }
        return { data: data as T, error: null };
      } catch (err) {
        console.error(`[DB] Supabase RPC error:`, err);
        if (shouldUseFallback) {
          console.warn(`[DB] Falling back to PostgREST`);
          return postgrest.rpc<T>(functionName, params);
        }
        return { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error', details: '', hint: '', code: 'RPC_ERROR' } };
      }
    }
    return postgrest.rpc<T>(functionName, params);
  }

  /**
   * Get the raw Supabase client (for auth, storage, etc.)
   * Returns null if Supabase is not configured
   */
  getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

  /**
   * Check if we're using Supabase or PostgREST
   */
  isUsingSupabase(): boolean {
    return this.useSupabase;
  }
}

/**
 * Table builder that tries Supabase first, falls back to PostgREST on failure
 */
class FallbackTableBuilder<T = unknown> {
  private table: string;
  private supabase: SupabaseClient;
  private postgrestClient: typeof postgrest;

  constructor(table: string, supabase: SupabaseClient, postgrestClient: typeof postgrest) {
    this.table = table;
    this.supabase = supabase;
    this.postgrestClient = postgrestClient;
  }

  select(columns: string = '*') {
    return new FallbackQueryBuilder<T>(
      this.supabase.from(this.table).select(columns),
      () => this.postgrestClient.from<T>(this.table).select(columns),
      'select'
    );
  }

  insert(data: Partial<T> | Partial<T>[]) {
    return new FallbackInsertBuilder<T>(
      this.supabase.from(this.table).insert(data as Record<string, unknown> | Record<string, unknown>[]),
      () => this.postgrestClient.from<T>(this.table).insert(data),
      'insert'
    );
  }

  update(data: Partial<T>) {
    return new FallbackUpdateBuilder<T>(
      this.supabase.from(this.table).update(data as Record<string, unknown>),
      () => this.postgrestClient.from<T>(this.table).update(data),
      'update'
    );
  }

  delete() {
    return new FallbackDeleteBuilder<T>(
      this.supabase.from(this.table).delete(),
      () => this.postgrestClient.from<T>(this.table).delete(),
      'delete'
    );
  }
}

/**
 * Query builder with fallback support
 */
class FallbackQueryBuilder<T> {
  private supabaseQuery: ReturnType<ReturnType<SupabaseClient['from']>['select']>;
  private createPostgrestQuery: () => ReturnType<ReturnType<typeof postgrest.from<T>>['select']>;
  private postgrestQuery: ReturnType<ReturnType<typeof postgrest.from<T>>['select']> | null = null;
  private operation: string;

  constructor(
    supabaseQuery: ReturnType<ReturnType<SupabaseClient['from']>['select']>,
    createPostgrestQuery: () => ReturnType<ReturnType<typeof postgrest.from<T>>['select']>,
    operation: string
  ) {
    this.supabaseQuery = supabaseQuery;
    this.createPostgrestQuery = createPostgrestQuery;
    this.operation = operation;
  }

  private getPostgrestQuery() {
    if (!this.postgrestQuery) {
      this.postgrestQuery = this.createPostgrestQuery();
    }
    return this.postgrestQuery;
  }

  eq(column: string, value: string | number | boolean) {
    this.supabaseQuery = this.supabaseQuery.eq(column, value);
    this.postgrestQuery = this.getPostgrestQuery().eq(column, value);
    return this;
  }

  neq(column: string, value: string | number | boolean) {
    this.supabaseQuery = this.supabaseQuery.neq(column, value);
    this.postgrestQuery = this.getPostgrestQuery().neq(column, value);
    return this;
  }

  is(column: string, value: null | boolean) {
    this.supabaseQuery = this.supabaseQuery.is(column, value);
    this.postgrestQuery = this.getPostgrestQuery().is(column, value);
    return this;
  }

  in(column: string, values: (string | number)[]) {
    this.supabaseQuery = this.supabaseQuery.in(column, values);
    this.postgrestQuery = this.getPostgrestQuery().in(column, values);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.supabaseQuery = this.supabaseQuery.order(column, options);
    this.postgrestQuery = this.getPostgrestQuery().order(column, options);
    return this;
  }

  limit(count: number) {
    this.supabaseQuery = this.supabaseQuery.limit(count);
    this.postgrestQuery = this.getPostgrestQuery().limit(count);
    return this;
  }

  single() {
    this.supabaseQuery = this.supabaseQuery.single();
    this.postgrestQuery = this.getPostgrestQuery().single();
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: PostgrestResponse<T[]>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const { data, error } = await this.supabaseQuery;
      if (error) {
        console.error(`[DB] Supabase ${this.operation} failed: ${error.message}`);
        if (shouldUseFallback) {
          console.warn(`[DB] Falling back to PostgREST`);
          const fallbackResult = await this.getPostgrestQuery();
          return onfulfilled ? onfulfilled(fallbackResult as PostgrestResponse<T[]>) : fallbackResult as unknown as TResult;
        }
        const errorResult: PostgrestResponse<T[]> = { data: null, error: { message: error.message, details: '', hint: '', code: error.code || 'QUERY_ERROR' } };
        return onfulfilled ? onfulfilled(errorResult) : errorResult as unknown as TResult;
      }
      const result: PostgrestResponse<T[]> = { data: data as T[], error: null };
      return onfulfilled ? onfulfilled(result) : result as unknown as TResult;
    } catch (err) {
      console.error(`[DB] Supabase ${this.operation} error:`, err);
      if (shouldUseFallback) {
        console.warn(`[DB] Falling back to PostgREST`);
        const fallbackResult = await this.getPostgrestQuery();
        return onfulfilled ? onfulfilled(fallbackResult as PostgrestResponse<T[]>) : fallbackResult as unknown as TResult;
      }
      const errorResult: PostgrestResponse<T[]> = { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error', details: '', hint: '', code: 'QUERY_ERROR' } };
      return onfulfilled ? onfulfilled(errorResult) : errorResult as unknown as TResult;
    }
  }
}

/**
 * Insert builder with fallback support
 */
class FallbackInsertBuilder<T> {
  private supabaseQuery: ReturnType<ReturnType<SupabaseClient['from']>['insert']>;
  private createPostgrestQuery: () => ReturnType<ReturnType<typeof postgrest.from<T>>['insert']>;
  private postgrestQuery: ReturnType<ReturnType<typeof postgrest.from<T>>['insert']> | null = null;
  private operation: string;

  constructor(
    supabaseQuery: ReturnType<ReturnType<SupabaseClient['from']>['insert']>,
    createPostgrestQuery: () => ReturnType<ReturnType<typeof postgrest.from<T>>['insert']>,
    operation: string
  ) {
    this.supabaseQuery = supabaseQuery;
    this.createPostgrestQuery = createPostgrestQuery;
    this.operation = operation;
  }

  private getPostgrestQuery() {
    if (!this.postgrestQuery) {
      this.postgrestQuery = this.createPostgrestQuery();
    }
    return this.postgrestQuery;
  }

  select(columns: string = '*') {
    this.supabaseQuery = this.supabaseQuery.select(columns);
    this.postgrestQuery = this.getPostgrestQuery().select(columns);
    return this;
  }

  single() {
    this.supabaseQuery = this.supabaseQuery.single();
    this.postgrestQuery = this.getPostgrestQuery().single();
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: PostgrestResponse<T | T[] | null>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const { data, error } = await this.supabaseQuery;
      if (error) {
        console.error(`[DB] Supabase ${this.operation} failed: ${error.message}`);
        if (shouldUseFallback) {
          console.warn(`[DB] Falling back to PostgREST`);
          const fallbackResult = await this.getPostgrestQuery();
          return onfulfilled ? onfulfilled(fallbackResult as PostgrestResponse<T | T[] | null>) : fallbackResult as unknown as TResult;
        }
        const errorResult: PostgrestResponse<T | T[] | null> = { data: null, error: { message: error.message, details: '', hint: '', code: error.code || 'INSERT_ERROR' } };
        return onfulfilled ? onfulfilled(errorResult) : errorResult as unknown as TResult;
      }
      const result: PostgrestResponse<T | T[] | null> = { data: data as T | T[] | null, error: null };
      return onfulfilled ? onfulfilled(result) : result as unknown as TResult;
    } catch (err) {
      console.error(`[DB] Supabase ${this.operation} error:`, err);
      if (shouldUseFallback) {
        console.warn(`[DB] Falling back to PostgREST`);
        const fallbackResult = await this.getPostgrestQuery();
        return onfulfilled ? onfulfilled(fallbackResult as PostgrestResponse<T | T[] | null>) : fallbackResult as unknown as TResult;
      }
      const errorResult: PostgrestResponse<T | T[] | null> = { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error', details: '', hint: '', code: 'INSERT_ERROR' } };
      return onfulfilled ? onfulfilled(errorResult) : errorResult as unknown as TResult;
    }
  }
}

/**
 * Update builder with fallback support
 */
class FallbackUpdateBuilder<T> {
  private supabaseQuery: ReturnType<ReturnType<SupabaseClient['from']>['update']>;
  private createPostgrestQuery: () => ReturnType<ReturnType<typeof postgrest.from<T>>['update']>;
  private postgrestQuery: ReturnType<ReturnType<typeof postgrest.from<T>>['update']> | null = null;
  private operation: string;

  constructor(
    supabaseQuery: ReturnType<ReturnType<SupabaseClient['from']>['update']>,
    createPostgrestQuery: () => ReturnType<ReturnType<typeof postgrest.from<T>>['update']>,
    operation: string
  ) {
    this.supabaseQuery = supabaseQuery;
    this.createPostgrestQuery = createPostgrestQuery;
    this.operation = operation;
  }

  private getPostgrestQuery() {
    if (!this.postgrestQuery) {
      this.postgrestQuery = this.createPostgrestQuery();
    }
    return this.postgrestQuery;
  }

  eq(column: string, value: string | number | boolean) {
    this.supabaseQuery = this.supabaseQuery.eq(column, value);
    this.postgrestQuery = this.getPostgrestQuery().eq(column, value);
    return this;
  }

  select() {
    this.supabaseQuery = this.supabaseQuery.select();
    this.postgrestQuery = this.getPostgrestQuery().select();
    return this;
  }

  single() {
    this.supabaseQuery = this.supabaseQuery.single();
    this.postgrestQuery = this.getPostgrestQuery().single();
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: PostgrestResponse<T | null>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const { data, error } = await this.supabaseQuery;
      if (error) {
        console.error(`[DB] Supabase ${this.operation} failed: ${error.message}`);
        if (shouldUseFallback) {
          console.warn(`[DB] Falling back to PostgREST`);
          const fallbackResult = await this.getPostgrestQuery();
          return onfulfilled ? onfulfilled(fallbackResult as PostgrestResponse<T | null>) : fallbackResult as unknown as TResult;
        }
        const errorResult: PostgrestResponse<T | null> = { data: null, error: { message: error.message, details: '', hint: '', code: error.code || 'UPDATE_ERROR' } };
        return onfulfilled ? onfulfilled(errorResult) : errorResult as unknown as TResult;
      }
      const result: PostgrestResponse<T | null> = { data: data as T | null, error: null };
      return onfulfilled ? onfulfilled(result) : result as unknown as TResult;
    } catch (err) {
      console.error(`[DB] Supabase ${this.operation} error:`, err);
      if (shouldUseFallback) {
        console.warn(`[DB] Falling back to PostgREST`);
        const fallbackResult = await this.getPostgrestQuery();
        return onfulfilled ? onfulfilled(fallbackResult as PostgrestResponse<T | null>) : fallbackResult as unknown as TResult;
      }
      const errorResult: PostgrestResponse<T | null> = { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error', details: '', hint: '', code: 'UPDATE_ERROR' } };
      return onfulfilled ? onfulfilled(errorResult) : errorResult as unknown as TResult;
    }
  }
}

/**
 * Delete builder with fallback support
 */
class FallbackDeleteBuilder<T> {
  private supabaseQuery: ReturnType<ReturnType<SupabaseClient['from']>['delete']>;
  private createPostgrestQuery: () => ReturnType<ReturnType<typeof postgrest.from<T>>['delete']>;
  private postgrestQuery: ReturnType<ReturnType<typeof postgrest.from<T>>['delete']> | null = null;
  private operation: string;

  constructor(
    supabaseQuery: ReturnType<ReturnType<SupabaseClient['from']>['delete']>,
    createPostgrestQuery: () => ReturnType<ReturnType<typeof postgrest.from<T>>['delete']>,
    operation: string
  ) {
    this.supabaseQuery = supabaseQuery;
    this.createPostgrestQuery = createPostgrestQuery;
    this.operation = operation;
  }

  private getPostgrestQuery() {
    if (!this.postgrestQuery) {
      this.postgrestQuery = this.createPostgrestQuery();
    }
    return this.postgrestQuery;
  }

  eq(column: string, value: string | number | boolean) {
    this.supabaseQuery = this.supabaseQuery.eq(column, value);
    this.postgrestQuery = this.getPostgrestQuery().eq(column, value);
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: PostgrestResponse<null>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const { error } = await this.supabaseQuery;
      if (error) {
        console.error(`[DB] Supabase ${this.operation} failed: ${error.message}`);
        if (shouldUseFallback) {
          console.warn(`[DB] Falling back to PostgREST`);
          const fallbackResult = await this.getPostgrestQuery();
          return onfulfilled ? onfulfilled(fallbackResult as PostgrestResponse<null>) : fallbackResult as unknown as TResult;
        }
        const errorResult: PostgrestResponse<null> = { data: null, error: { message: error.message, details: '', hint: '', code: error.code || 'DELETE_ERROR' } };
        return onfulfilled ? onfulfilled(errorResult) : errorResult as unknown as TResult;
      }
      const result: PostgrestResponse<null> = { data: null, error: null };
      return onfulfilled ? onfulfilled(result) : result as unknown as TResult;
    } catch (err) {
      console.error(`[DB] Supabase ${this.operation} error:`, err);
      if (shouldUseFallback) {
        console.warn(`[DB] Falling back to PostgREST`);
        const fallbackResult = await this.getPostgrestQuery();
        return onfulfilled ? onfulfilled(fallbackResult as PostgrestResponse<null>) : fallbackResult as unknown as TResult;
      }
      const errorResult: PostgrestResponse<null> = { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error', details: '', hint: '', code: 'DELETE_ERROR' } };
      return onfulfilled ? onfulfilled(errorResult) : errorResult as unknown as TResult;
    }
  }
}

// Create singleton instance
const databaseClient = new DatabaseClient();

// Export the unified database client
export const db = databaseClient;
export const supabase = databaseClient;

// Export raw Supabase client for auth features
export const supabaseAuth = supabaseClient;

// For components that import from '@/lib/supabase', this maintains compatibility
export default databaseClient;
