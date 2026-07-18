# Domain Boundaries — Alove

## Call session

Server tạo call ID, customer identity và signed capability. Session sở hữu room,
TTL và redispatch budget; browser không được tự chọn các giá trị này.

## Voice agent

Python worker sở hữu STT, turn detection, LLM tool selection và TTS. Nó không sở
hữu inventory fact. Tool response là nguồn duy nhất cho thông tin vận hành.

## Inventory và booking

Next.js booking service sở hữu route/trip/seat search, expiring holds, fare,
confirmation, idempotency và cancellation. Neon là state authoritative.

## Realtime presentation

LiveKit caption và data channel cập nhật UI nhanh. Event phải đúng agent kind,
call ID, schema và sequence. Realtime state không thay thế booking database.

## Audit và dashboard

Agent gửi final transcript và booking snapshot qua API có bearer auth. `eventId`
chống duplicate. Dashboard chỉ đọc projection và observer stream.

## Operator data

Seed pipeline biến năm CSV của Mai Anh thành trip/seat cụ thể. Nó không sửa trạng
thái ghế đã hold/booked và không sinh fact ngoài input.
