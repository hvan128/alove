'use client'

import type { BookingSnapshot } from '@/lib/call-contract'
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
      // Tọa độ là tâm đệm nằm của hai phòng đầu mỗi dãy trên chính ảnh PNG,
      // không phải tâm của vách phòng. Chấm neo bên dưới nhãn sẽ trỏ vào đây.
      [[31.5, 14], [27.5, 22.5], [45.5, 22], [41.5, 30.5], [59.5, 30], [55.5, 38.5], [73.5, 38], [69.5, 46.5], [87, 46], [83, 54.5]],
    ),
  },
}

export function VehicleSeatVisual({ booking }: { booking: BookingSnapshot }) {
  const trip = booking.selectedTrip
  if (!trip || booking.status === 'confirmed') return null

  const preset = vehiclePreset(trip.vehicleType)
  const heldSeats = new Set(booking.seats)
  const presetById = new Map(preset.hotspots.map((spot) => [spot.id, spot]))
  // Mã ghế phụ thuộc từng cấu hình xe. Nếu chưa có trong preset hình ảnh, đặt
  // lần lượt vào hotspot có sẵn để vẫn biểu diễn đúng những ghế backend đã giữ.
  const heldHotspots = booking.seats.map((id, index) => ({
    ...(presetById.get(id) ?? preset.hotspots[index % preset.hotspots.length]!),
    id,
  }))

  return (
    <aside aria-label={`Ghế đang giữ trên ${trip.vehicleType}`} className="vehicle-seat-stage relative h-full min-h-[470px]">
      <header className="relative z-20 flex items-start justify-between gap-4 px-2 pt-2 sm:px-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Vị trí trên xe</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.025em]">{preset.shortName}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{preset.description}</p>
        </div>
        <div className="flex max-w-[45%] shrink-0 items-center justify-end gap-2 pt-0.5 text-right text-xs font-semibold leading-5 text-[var(--action)]">
          <span aria-hidden className="size-2.5 rounded-full bg-[var(--action)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--action)_14%,transparent)]" />
          {booking.seats.length > 0 ? `${booking.seats.length} ghế đang giữ` : 'Đang chọn ghế'}
        </div>
      </header>

      <div className="vehicle-model-wrap relative mt-4 aspect-[3/2] w-full">
        <span aria-hidden className="vehicle-ground-shadow absolute bottom-[9%] left-[12%] h-[18%] w-[76%] rounded-[50%] bg-black/30 blur-2xl" />
        <Image
          src={preset.image}
          alt={`Mô hình 3D ${preset.shortName} với các ghế đang giữ được đánh dấu trực tiếp`}
          fill
          priority
          sizes="(min-width: 1280px) 430px, (min-width: 768px) 380px, 100vw"
          className="vehicle-model object-contain"
        />

        <div aria-hidden className="absolute inset-0 z-10">
          {heldHotspots.map((spot, index) => {
            return (
              <span
                key={spot.id}
                className={cn('vehicle-hotspot vehicle-hotspot-suggested absolute')}
                style={{ left: `${spot.x}%`, top: `${spot.y}%`, animationDelay: `${Math.min(index, 5) * 45}ms` }}
              >
                <span className="vehicle-hotspot-pin">{spot.id}</span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="vehicle-seat-summary relative z-20 mt-8 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-[var(--hairline)] px-2 pt-4 sm:px-4">
        <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
          <Legend tone="suggested" label="Ghế đang giữ" />
        </div>
        <p className="text-right text-xs leading-5 text-[var(--muted)]">
          {heldSeats.size
            ? `Đang giữ ${Array.from(heldSeats).join(', ')} cho ${booking.passengerCount ?? 1} khách`
            : 'Tổng đài đang tìm vị trí phù hợp'}
        </p>
      </div>

      <ul className="sr-only">
        {heldHotspots.map((spot) => (
          <li key={spot.id}>Vị trí {spot.id}: đang được giữ cho cuộc gọi này</li>
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
