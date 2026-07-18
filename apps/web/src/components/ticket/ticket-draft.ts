import type { BookingDraft } from '@ordervoice/contracts'
import type { CustomerTicket } from '@/lib/db/booking-store'

/**
 * Vé đã lưu, mặc lại hình dạng bản nháp trong cuộc gọi.
 *
 * `TicketCard` vẽ theo `BookingDraft` vì nó sinh ra để bám một cuộc gọi đang
 * diễn ra. Trang tra cứu thì đọc từ database, nơi vé đã xong và nói thứ ngôn
 * ngữ khác. Thay vì dạy card ngôn ngữ thứ hai — hoặc nhân bản 400 dòng thiết kế
 * vé in nhiệt — chỗ này dịch một chiều sang đúng kiểu card đã biết.
 */

// Giờ Việt Nam: vé đọc trên máy nào, ở múi giờ nào cũng phải ra giờ nhà xe chạy.
const TZ = 'Asia/Ho_Chi_Minh'

export function bookingDraftFromTicket(ticket: CustomerTicket): BookingDraft {
  const departsAt = new Date(ticket.departureAt)
  const passengerCount = ticket.seatCodes.length
  const departureTime = formatClock(departsAt)

  return {
    id: ticket.code,
    conversationId: ticket.code,
    // BookingDraft không có trạng thái 'cancelled' — nó chỉ mô tả một cuộc gọi
    // đang chạy. Vé huỷ vẫn phải in ra để khách đối chiếu, nên cảnh báo huỷ do
    // trang vé hiện riêng bên ngoài card (xem ticket-lookup.tsx).
    status: 'confirmed',
    // Vé này đọc từ database chứ không phải catalog demo trong bộ nhớ.
    runtimeProfile: 'durable',
    // Những trường dưới đây thuộc về cuộc gọi đang diễn ra — bằng chứng theo
    // từng ô, hàng chờ soát lại, mã giữ ghế. Vé đã chốt rồi thì không còn gì
    // để lần vết, nên để trống thay vì bịa ra giá trị.
    catalogVersionId: null,
    tripId: null,
    seatHoldId: null,
    vehiclePreference: null,
    paymentMethod: null,
    note: null,
    fieldEvidence: {},
    confirmedFields: [],
    reviewItems: [],
    origin: ticket.originCity,
    destination: ticket.destinationCity,
    travelDateLabel: formatTravelDate(departsAt),
    timeWindow: null,
    passengerCount,
    selectedTrip: {
      id: ticket.code,
      origin: ticket.originCity,
      destination: ticket.destinationCity,
      departureTime,
      // Giờ đến có thể trống trong dữ liệu nhà xe. Vé in không hiển thị trường
      // này, nên chỗ trống chỉ cần thoả kiểu BusTrip chứ không bao giờ đọc tới.
      arrivalTime: ticket.arrivalAt ? formatClock(new Date(ticket.arrivalAt)) : departureTime,
      vehicleType: ticket.vehicleType,
      priceVnd: passengerCount > 0 ? Math.round(ticket.totalVnd / passengerCount) : ticket.totalVnd,
      pickupPoint: ticket.pickupPoint,
      dropoffPoint: ticket.dropoffPoint,
      availableSeats: [],
    },
    seats: ticket.seatCodes,
    pickupPoint: ticket.pickupPoint,
    dropoffPoint: ticket.dropoffPoint,
    passengerName: ticket.passengerName,
    // Đã che từ tầng dữ liệu — số đầy đủ không rời khỏi máy chủ.
    phone: ticket.phoneMasked,
    totalFareVnd: ticket.totalVnd,
    bookingCode: ticket.code,
    evidenceMessageIds: [],
  }
}

/** Đoạn khách gửi cho chính mình qua Zalo — đọc được mà không cần mở link. */
export function ticketShareText(ticket: CustomerTicket, url: string): string {
  const departsAt = new Date(ticket.departureAt)
  const lines = [
    `🎟 Vé xe Alove — ${ticket.code}`,
    `${ticket.originCity} → ${ticket.destinationCity}`,
    `${formatTravelDate(departsAt)}, ${formatClock(departsAt)}`,
    `Ghế: ${ticket.seatCodes.join(', ')}`,
    `Đón tại: ${ticket.pickupPoint}`,
    `Hành khách: ${ticket.passengerName}`,
    `Tổng tiền: ${new Intl.NumberFormat('vi-VN').format(ticket.totalVnd)} ₫`,
    '',
    url,
  ]
  return lines.join('\n')
}

function formatTravelDate(value: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', timeZone: TZ,
  }).format(value)
}

function formatClock(value: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  }).format(value)
}
