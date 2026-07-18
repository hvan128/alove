import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr'

/**
 * Plain GET form rather than a client-side filter: search state stays in the
 * URL, so a dispatcher can bookmark or share "everything on the Đà Lạt
 * corridor", and the page keeps working with JavaScript disabled.
 */
export function OperationsSearch({ query }: { query: string }) {
  return (
    <form action="/operations" role="search" className="mt-6 flex flex-wrap items-center gap-2">
      <label htmlFor="operations-search" className="sr-only">
        Tìm cuộc gọi theo mã phiên, tuyến hoặc người nhận
      </label>
      <div className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4">
        <MagnifyingGlassIcon size={17} aria-hidden className="shrink-0 text-[var(--muted)]" />
        <input
          id="operations-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Mã phiên, tuyến hoặc người nhận"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[var(--subtle)]"
        />
      </div>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-full bg-[var(--ink)] px-5 text-sm font-medium text-[var(--on-ink)]"
      >
        Tìm
      </button>
      {query ? (
        <a
          href="/operations"
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--hairline)] px-4 text-sm text-[var(--muted)]"
        >
          Xóa lọc
        </a>
      ) : null}
    </form>
  )
}
