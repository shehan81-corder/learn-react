/**
 * Hand-written, simplified type declarations for the third-party libraries that
 * the exercises load from a CDN. The editor has no network access to real
 * type packages, so these give learners autocomplete and meaningful errors.
 */

export const REACT_ROUTER_TYPES = `
declare module 'react-router-dom' {
  import type { AnchorHTMLAttributes, CSSProperties, ReactElement, ReactNode } from 'react';

  export interface Path { pathname: string; search: string; hash: string }
  export type To = string | Partial<Path>;
  export interface Location<State = any> extends Path { state: State; key: string }

  export function MemoryRouter(props: {
    initialEntries?: Array<string | Partial<Location>>;
    initialIndex?: number;
    children?: ReactNode;
  }): ReactElement;
  export function BrowserRouter(props: { basename?: string; children?: ReactNode }): ReactElement;

  export function Routes(props: { children?: ReactNode; location?: Partial<Location> | string }): ReactElement | null;
  export function Route(props: {
    path?: string;
    index?: boolean;
    caseSensitive?: boolean;
    element?: ReactNode;
    children?: ReactNode;
  }): ReactElement | null;

  export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
    to: To;
    replace?: boolean;
    state?: unknown;
  }
  export function Link(props: LinkProps): ReactElement;

  export interface NavLinkRenderProps { isActive: boolean; isPending: boolean; isTransitioning: boolean }
  export interface NavLinkProps extends Omit<LinkProps, 'className' | 'style' | 'children'> {
    end?: boolean;
    caseSensitive?: boolean;
    className?: string | ((props: NavLinkRenderProps) => string | undefined);
    style?: CSSProperties | ((props: NavLinkRenderProps) => CSSProperties | undefined);
    children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
  }
  export function NavLink(props: NavLinkProps): ReactElement;

  export function Navigate(props: { to: To; replace?: boolean; state?: unknown }): null;
  export function Outlet(props?: { context?: unknown }): ReactElement | null;

  export function useParams<P extends string | Record<string, string | undefined> = string>(): Readonly<
    [P] extends [string] ? Partial<Record<P, string>> : Partial<P>
  >;
  export interface NavigateFunction {
    (to: To, options?: { replace?: boolean; state?: unknown }): void;
    (delta: number): void;
  }
  export function useNavigate(): NavigateFunction;
  export function useLocation<State = any>(): Location<State>;
  export function useSearchParams(
    defaultInit?: string | Record<string, string> | URLSearchParams,
  ): [
    URLSearchParams,
    (
      next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean; state?: unknown },
    ) => void,
  ];
}
`;

export const REACT_QUERY_TYPES = `
declare module '@tanstack/react-query' {
  import type { ReactElement, ReactNode } from 'react';

  export type QueryKey = readonly unknown[];
  export interface QueryFilters { queryKey?: QueryKey; exact?: boolean }

  export interface DefaultQueryOptions {
    retry?: boolean | number;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchOnMount?: boolean;
  }

  export class QueryClient {
    constructor(config?: { defaultOptions?: { queries?: DefaultQueryOptions; mutations?: { retry?: boolean | number } } });
    getQueryData<TData = unknown>(queryKey: QueryKey): TData | undefined;
    setQueryData<TData = unknown>(
      queryKey: QueryKey,
      updater: TData | undefined | ((old: TData | undefined) => TData | undefined),
    ): TData | undefined;
    invalidateQueries(filters?: QueryFilters): Promise<void>;
    cancelQueries(filters?: QueryFilters): Promise<void>;
    refetchQueries(filters?: QueryFilters): Promise<void>;
    removeQueries(filters?: QueryFilters): void;
    clear(): void;
  }
  export function QueryClientProvider(props: { client: QueryClient; children?: ReactNode }): ReactElement;
  export function useQueryClient(): QueryClient;
  export function keepPreviousData<T>(previousData: T | undefined): T | undefined;

  export interface UseQueryOptions<TQueryFnData = unknown, TError = Error, TData = TQueryFnData> {
    queryKey: QueryKey;
    queryFn?: (context: { queryKey: QueryKey; signal: AbortSignal }) => Promise<TQueryFnData> | TQueryFnData;
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    retry?: boolean | number | ((failureCount: number, error: TError) => boolean);
    refetchOnWindowFocus?: boolean;
    refetchOnMount?: boolean;
    refetchInterval?: number | false;
    select?: (data: TQueryFnData) => TData;
    placeholderData?: TQueryFnData | ((previousData: TQueryFnData | undefined) => TQueryFnData | undefined);
  }
  type QueryBase = {
    isFetching: boolean;
    isLoading: boolean;
    isPlaceholderData: boolean;
    dataUpdatedAt: number;
    fetchStatus: 'fetching' | 'paused' | 'idle';
    refetch: () => Promise<unknown>;
  };
  export type UseQueryResult<TData = unknown, TError = Error> = QueryBase &
    (
      | { status: 'pending'; isPending: true; isError: false; isSuccess: false; data: undefined; error: null }
      | { status: 'error'; isPending: false; isError: true; isSuccess: false; data: TData | undefined; error: TError }
      | { status: 'success'; isPending: false; isError: false; isSuccess: true; data: TData; error: null }
    );
  export function useQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>(
    options: UseQueryOptions<TQueryFnData, TError, TData>,
  ): UseQueryResult<TData, TError>;

  export interface UseMutationOptions<TData = unknown, TError = Error, TVariables = void, TContext = unknown> {
    mutationFn?: (variables: TVariables) => Promise<TData>;
    onMutate?: (variables: TVariables) => Promise<TContext | undefined> | TContext | undefined;
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => unknown;
    onError?: (error: TError, variables: TVariables, context: TContext | undefined) => unknown;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined) => unknown;
    retry?: boolean | number;
  }
  type MutationBase<TData, TVariables> = {
    mutate: (variables: TVariables, options?: { onSuccess?: (data: TData) => void; onError?: (error: Error) => void }) => void;
    mutateAsync: (variables: TVariables) => Promise<TData>;
    reset: () => void;
    variables: TVariables | undefined;
  };
  export type UseMutationResult<TData = unknown, TError = Error, TVariables = void> = MutationBase<TData, TVariables> &
    (
      | { status: 'idle'; isIdle: true; isPending: false; isError: false; isSuccess: false; data: undefined; error: null }
      | { status: 'pending'; isIdle: false; isPending: true; isError: false; isSuccess: false; data: undefined; error: null }
      | { status: 'error'; isIdle: false; isPending: false; isError: true; isSuccess: false; data: undefined; error: TError }
      | { status: 'success'; isIdle: false; isPending: false; isError: false; isSuccess: true; data: TData; error: null }
    );
  export function useMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
    options: UseMutationOptions<TData, TError, TVariables, TContext>,
  ): UseMutationResult<TData, TError, TVariables>;
}
`;

/**
 * Ambient declarations for the test helpers the sandbox injects as globals (see
 * src/sandbox/harness.js). Exercises about *writing tests* call these in the learner's own code.
 */
export const HARNESS_GLOBAL_TYPES = `
interface HarnessMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeNaN(): void;
  toBeTypeOf(type: string): void;
  toBeInstanceOf(constructor: Function): void;
  toContain(item: unknown): void;
  toContainEqual(item: unknown): void;
  toHaveLength(length: number): void;
  toHaveProperty(path: string, value?: unknown): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toBeCloseTo(n: number, digits?: number): void;
  toMatch(pattern: RegExp | string): void;
  toMatchObject(expected: object): void;
  toThrow(expected?: string | RegExp | Function): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(times: number): void;
  toHaveBeenCalledWith(...args: unknown[]): void;
}
declare function test(name: string, run: () => void | Promise<void>): void;
declare const it: typeof test;
declare function expect(actual: unknown): HarnessMatchers & {
  not: HarnessMatchers;
  resolves: { toBe(expected: unknown): Promise<void>; toEqual(expected: unknown): Promise<void> };
  rejects: { toThrow(expected?: string | RegExp | Function): Promise<void> };
};
declare function fn<T extends (...args: any[]) => any = (...args: any[]) => any>(implementation?: T): T & { calls: any[][]; mockClear(): void };
interface HarnessView {
  container: HTMLElement;
  readonly text: string;
  $(selector: string): any;
  $$(selector: string): any[];
  getByText(text: string | RegExp): any;
  queryByText(text: string | RegExp): any;
  getByRole(role: string, options?: { name?: string | RegExp }): any;
  getAllByRole(role: string): any[];
  rerender(element: any): Promise<void>;
  unmount(): void;
}
declare function render(element: any): Promise<HarnessView>;
declare function flush(): Promise<void>;
declare function sleep(ms: number): Promise<void>;
declare function click(element: Element | null): Promise<void>;
declare function type(element: Element | null, value: string): Promise<void>;
declare function select(element: Element | null, value: string): Promise<void>;
declare function check(element: Element | null, checked?: boolean): Promise<void>;
declare function submit(form: Element | null): Promise<void>;
declare function keyDown(element: Element | null, key: string, extra?: object): Promise<void>;
declare function useFakeTimers(): { advance(ms: number): Promise<void>; pending(): number; now(): number; restore(): void };
`;
