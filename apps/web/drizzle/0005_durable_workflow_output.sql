ALTER TABLE "booking_webhook_outbox" DROP CONSTRAINT "booking_webhook_outbox_attempts_nonnegative_check";--> statement-breakpoint
ALTER TABLE "booking_webhook_outbox" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "verification_snapshot" jsonb;--> statement-breakpoint
CREATE FUNCTION "bookings_fill_verification_snapshot"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  trip_row record;
  seat_count integer;
BEGIN
  IF NEW.verification_snapshot IS NOT NULL THEN
    RETURN NEW;
  END IF;

  seat_count := jsonb_array_length(NEW.seat_codes);
  IF seat_count < 1 OR NEW.total_fare_vnd % seat_count <> 0 THEN
    RAISE EXCEPTION 'cannot derive a self-consistent verification snapshot';
  END IF;

  SELECT t.departure_at,
         t.arrival_at,
         t.vehicle_type,
         t.pickup_point,
         t.dropoff_point,
         r.origin_city,
         r.destination_city
  INTO STRICT trip_row
  FROM "trips" AS t
  INNER JOIN "routes" AS r ON r.id = t.route_id
  WHERE t.id = NEW.trip_id;

  NEW.verification_snapshot := jsonb_build_object(
    'id', concat('booking-', NEW.id),
    'conversationId', coalesce(nullif(NEW.call_id, ''), concat('verified-', NEW.code)),
    'status', 'confirmed',
    'origin', trip_row.origin_city,
    'destination', trip_row.destination_city,
    'travelDateLabel', to_char(
      trip_row.departure_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
      'DD/MM/YYYY'
    ),
    'passengerCount', seat_count,
    'selectedTrip', jsonb_build_object(
      'id', NEW.trip_id,
      'origin', trip_row.origin_city,
      'destination', trip_row.destination_city,
      'departureTime', to_char(
        trip_row.departure_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        'HH24:MI'
      ),
      'arrivalTime', CASE WHEN trip_row.arrival_at IS NULL THEN NULL ELSE to_char(
        trip_row.arrival_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        'HH24:MI'
      ) END,
      'vehicleType', trip_row.vehicle_type,
      'priceVnd', NEW.total_fare_vnd / seat_count,
      'pickupPoint', trip_row.pickup_point,
      'dropoffPoint', trip_row.dropoff_point,
      'seatNoun', CASE
        WHEN lower(trip_row.vehicle_type) LIKE '%phòng%'
          OR lower(trip_row.vehicle_type) LIKE '%cabin%' THEN 'phòng'
        WHEN lower(trip_row.vehicle_type) LIKE '%giường%' THEN 'giường'
        ELSE 'ghế'
      END
    ),
    'seats', NEW.seat_codes,
    'passengerName', NEW.passenger_name,
    'phone', NEW.phone,
    'totalFareVnd', NEW.total_fare_vnd,
    'bookingCode', NEW.code
  );
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "bookings_fill_verification_snapshot_before_insert"
BEFORE INSERT ON "bookings"
FOR EACH ROW
EXECUTE FUNCTION "bookings_fill_verification_snapshot"();--> statement-breakpoint
WITH confirmed_snapshots AS (
  SELECT DISTINCT ON (b.id)
         b.id AS booking_id,
         bs.snapshot
  FROM "bookings" AS b
  INNER JOIN "booking_snapshots" AS bs
    ON bs.call_id = b.call_id
   AND bs.status = 'confirmed'
   AND bs.booking_code = b.code
   AND bs.snapshot ->> 'status' = 'confirmed'
   AND bs.snapshot ->> 'bookingCode' = b.code
   AND bs.snapshot ->> 'phone' = b.phone
   AND bs.snapshot -> 'seats' = b.seat_codes
   AND bs.snapshot ->> 'totalFareVnd' = b.total_fare_vnd::text
  ORDER BY b.id, bs.sequence DESC
)
UPDATE "bookings" AS b
SET "verification_snapshot" = confirmed_snapshots.snapshot
FROM confirmed_snapshots
WHERE confirmed_snapshots.booking_id = b.id
  AND b.verification_snapshot IS NULL;--> statement-breakpoint
ALTER TABLE "booking_webhook_outbox" ADD CONSTRAINT "booking_webhook_outbox_status_check" CHECK ("booking_webhook_outbox"."status" in ('pending', 'delivering', 'delivered', 'failed'));--> statement-breakpoint
ALTER TABLE "booking_webhook_outbox" ADD CONSTRAINT "booking_webhook_outbox_attempts_bounded_check" CHECK ("booking_webhook_outbox"."attempts" between 0 and 3);
