/**
 * Trang là force-dynamic và phải đợi vài truy vấn Neon, nên lần vào đầu tiên
 * không có skeleton sẽ là màn trắng. prefers-reduced-motion đã tắt animation ở
 * tầng global nên khung xám vẫn đọc được khi người dùng tắt chuyển động.
 */
export default function DashboardLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6"
      aria-busy
      aria-label="Đang tải số liệu dashboard"
    >
      <span className="h-4 w-72 max-w-full animate-pulse rounded-full bg-[var(--pearl)]" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((slot) => (
          <div
            key={slot}
            className="flex h-[164px] animate-pulse flex-col rounded-[16px] border border-[var(--hairline)] bg-[var(--pearl)]"
          />
        ))}
      </div>

      {[0, 1].map((row) => (
        <div key={row} className="grid gap-3 lg:grid-cols-3">
          <div className="h-[280px] animate-pulse rounded-[16px] border border-[var(--hairline)] bg-[var(--pearl)] lg:col-span-2" />
          <div className="h-[280px] animate-pulse rounded-[16px] border border-[var(--hairline)] bg-[var(--pearl)]" />
        </div>
      ))}
    </main>
  )
}
