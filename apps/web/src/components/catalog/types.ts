import type { CatalogVersion } from '@ordervoice/contracts'

export type CatalogStatus = CatalogVersion['status']
export type CatalogTab = 'locations' | 'routes' | 'trips' | 'vehicles' | 'fares'
