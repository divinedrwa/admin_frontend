export type AmenityTypeId =
  | "CLUBHOUSE"
  | "GYM"
  | "SWIMMING_POOL"
  | "SPORTS_COURT"
  | "BANQUET_HALL"
  | "GUEST_ROOM"
  | "PLAYGROUND"
  | "PARKING"
  | "OTHER";

export type Amenity = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  capacity: number | null;
  isActive: boolean;
  pricePerHour: number | string | null;
};

export type AmenityForm = {
  name: string;
  type: AmenityTypeId;
  description: string;
  capacity: string;
  isActive: boolean;
  pricePerHour: string;
};

export type AmenityBooking = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice?: number;
  amenity?: {
    name: string;
    type: string;
  } | null;
  resident?: {
    name: string;
  } | null;
};
