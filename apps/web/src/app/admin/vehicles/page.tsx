import { VehicleTemplateEditor } from '@/components/vehicles/vehicle-template-editor'
import { createCatalogRepository } from '@/lib/catalog/catalog-repository'

export const dynamic = 'force-dynamic'

export default async function VehicleAdminPage() {
  const versions = await createCatalogRepository().listVersions()
  const catalog = versions.find((version) => version.status === 'draft' || version.status === 'validated') ?? versions[0]
  const template = catalog?.vehicleTemplates[0]

  if (!catalog || !template) {
    return <main className="grid min-h-[70vh] place-items-center text-center"><div><p className="text-sm font-medium text-[var(--action)]">Thiết kế phương tiện</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Chưa có mẫu xe</h1><p className="mt-4 text-[var(--muted)]">Thêm mẫu xe vào catalog draft trước khi mở trình thiết kế sơ đồ ghế.</p></div></main>
  }

  return <VehicleTemplateEditor template={template} catalog={catalog} />
}
