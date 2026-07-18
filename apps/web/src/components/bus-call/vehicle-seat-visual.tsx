'use client'

import type { BookingDraft } from '@ordervoice/contracts'
import Image from 'next/image'
import { cn } from '@/lib/cn'

type SeatHotspot = {
  id: string
  x: number
  y: number
}

type VehiclePreset = {
  image: string
  shortName: string
  description: string
  hotspots: SeatHotspot[]
}

const SLEEPER_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [37, 34], [49, 27], [61, 20],
  [47, 43], [59, 35], [71, 27],
  [57, 52], [69, 44], [80, 35],
  [43, 57], [54, 50], [65, 43],
  [54, 66], [65, 58], [76, 50],
  [65, 74], [76, 66], [86, 57],
  [83, 24], [88, 31], [91, 39],
]

const VEHICLES: Record<'sleeper34' | 'sleeper38' | 'limousine21', VehiclePreset> = {
  sleeper34: {
    image: '/vehicles/sleeper-34-v2.png',
    shortName: 'Giường nằm 34 chỗ',
    description: 'Hai tầng · đầu xe bên trái',
    hotspots: makeHotspots(deckSeatIds(), SLEEPER_SPOTS),
  },
  sleeper38: {
    image: '/vehicles/sleeper-38.png',
    shortName: 'Giường nằm 38 chỗ',
    description: 'Hai tầng · khoang cuối V',
    hotspots: makeHotspots([...deckSeatIds(), 'V1', 'V2', 'V3'], SLEEPER_SPOTS),
  },
  limousine21: {
    image: '/vehicles/limousine-21.png',
    shortName: 'Limousine 21 Phòng VIP',
    description: 'Phòng riêng · hai lối đi',
    hotspots: makeHotspots(
      ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'],
      [[31, 20], [25, 30], [42, 29], [35, 40], [53, 38], [47, 49], [66, 47], [59, 58], [79, 56], [72, 67]],
    ),
  },
}

export function VehicleSeatVisual({ booking }: { booking: BookingDraft }) {
  const trip = booking.selectedTrip
  if (!trip || booking.status === 'confirmed') return null

  const preset = vehiclePreset(trip.vehicleType)
  const suggested = new Set(trip.availableSeats.slice(0, booking.passengerCount ?? 1))
  const presetById = new Map(preset.hotspots.map((spot) => [spot.id, spot]))
  // Catalog cũ dùng mã A05/A06, còn DB nhà xe dùng A1/A2. Nếu mã chưa có
  // trong preset, lấy lần lượt đúng các vị trí 3D để trạng thái trống vẫn hiện.
  const availableHotspots = trip.availableSeats.map((id, index) => ({
    ...(presetById.get(id) ?? preset.hotspots[index % preset.hotspots.length]!),
    id,
  }))

  return (
    <aside aria-label={`Vị trí ghế trống trên ${trip.vehicleType}`} className="vehicle-seat-stage relative h-full min-h-[420px]">
      <header className="relative z-20 flex items-start justify-between gap-4 px-2 pt-2 sm:px-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Chọn trực tiếp trên xe</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.025em]">{preset.shortName}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{preset.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5 text-xs font-semibold text-[var(--action)]">
          <span aria-hidden className="size-2.5 rounded-full bg-[var(--action)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--action)_14%,transparent)]" />
          {trip.availableSeats.length} vị trí trống
        </div>
      </header>

      <div className="vehicle-model-wrap relative mt-3 aspect-[3/2] w-full">
        <span aria-hidden className="vehicle-ground-shadow absolute bottom-[9%] left-[12%] h-[18%] w-[76%] rounded-[50%] bg-black/30 blur-2xl" />
        <Image
          src={preset.image}
          alt={`Mô hình 3D ${preset.shortName} với các vị trí còn trống được đánh dấu trực tiếp`}
          fill
          priority
          sizes="(min-width: 1280px) 430px, (min-width: 768px) 380px, 100vw"
          className="vehicle-model object-contain"
        />

        <div aria-hidden className="absolute inset-0 z-10">
          {availableHotspots.map((spot, index) => {
            const isSuggested = suggested.has(spot.id)
            return (
              <span
                key={spot.id}
                className={cn('vehicle-hotspot absolute', isSuggested && 'vehicle-hotspot-suggested')}
                style={{ left: `${spot.x}%`, top: `${spot.y}%`, animationDelay: `${Math.min(index, 5) * 45}ms` }}
              >
                <span className="vehicle-hotspot-pin">{spot.id}</span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="relative z-20 -mt-3 flex flex-wrap items-center justify-between gap-3 px-2 sm:px-4">
        <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
          <Legend tone="available" label="Còn trống" />
          <Legend tone="suggested" label="Gợi ý gần nhau" />
        </div>
        <p className="text-right text-xs leading-5 text-[var(--muted)]">
          {suggested.size
            ? `Đang gợi ý ${Array.from(suggested).join(', ')} cho ${booking.passengerCount ?? 1} khách`
            : 'Đang tìm vị trí phù hợp'}
        </p>
      </div>

      <ul className="sr-only">
        {availableHotspots.map((spot) => (
          <li key={spot.id}>Vị trí {spot.id}: {suggested.has(spot.id) ? 'đang được gợi ý' : 'còn trống'}</li>
        ))}
      </ul>
    </aside>
  )
}

function Legend({ tone, label }: { tone: 'available' | 'suggested'; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          'h-3 w-5 rounded-full border-2 border-white shadow-sm',
          tone === 'available' ? 'bg-[var(--action)]' : 'bg-[var(--warning)]',
        )}
      />
      {label}
    </span>
  )
}

function vehiclePreset(vehicleType: string): VehiclePreset {
  const normalized = vehicleType.toLocaleLowerCase('vi-VN')
  if (normalized.includes('limousine') || normalized.includes('phòng')) return VEHICLES.limousine21
  if (normalized.includes('38')) return VEHICLES.sleeper38
  return VEHICLES.sleeper34
}

function deckSeatIds(): string[] {
  return ['A', 'C', 'E', 'B', 'D', 'F'].flatMap((row) => [1, 2, 3].map((column) => `${row}${column}`))
}

function makeHotspots(ids: string[], coordinates: ReadonlyArray<readonly [number, number]>): SeatHotspot[] {
  return ids.map((id, index) => ({ id, x: coordinates[index]![0], y: coordinates[index]![1] }))
}
