import { CatalogWorkspace } from '@/components/catalog/catalog-workspace'
import { getOperatorActor } from '@/lib/auth/operator-actor'
import { createCatalogRepository } from '@/lib/catalog/catalog-repository'

export const dynamic = 'force-dynamic'

export default async function CatalogAdminPage() {
  const actor = getOperatorActor(process.env)
  const versions = await createCatalogRepository().listVersions()
  const current = versions.find((version) => version.status === 'draft' || version.status === 'validated') ?? versions[0]

  if (!current) {
    return (
      <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center text-center">
        <div>
          <p className="text-sm font-medium text-[var(--action)]">Catalog nhà xe</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Chưa có phiên bản catalog</h1>
          <p className="mt-4 leading-7 text-[var(--muted)]">Tạo draft qua Catalog API hoặc bật bộ dữ liệu demo để bắt đầu quản trị tuyến, chuyến, xe và giá.</p>
        </div>
      </main>
    )
  }

  return <CatalogWorkspace initial={current} actorRole={actor.role} />
}
