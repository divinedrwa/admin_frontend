export type VehicleType = "TWO_WHEELER" | "FOUR_WHEELER" | "BICYCLE" | "OTHER";

export type VehicleRegistrationCategory = "RESIDENT" | "VISITOR" | "OTHER";

export type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType?: VehicleType | string | null;
  model: string;
  color: string;
  parkingSlot: string;
  registrationCategory?: VehicleRegistrationCategory | string | null;
  source?: string | null;
  ownerLabel?: string | null;
  notes?: string | null;
  villa?: {
    villaNumber: string;
    block: string;
  } | null;
};

export type VehicleForm = {
  registrationCategory: VehicleRegistrationCategory;
  vehicleNumber: string;
  vehicleType: VehicleType;
  model: string;
  color: string;
  parkingSlot: string;
  villaId: string;
  ownerLabel: string;
  notes: string;
};
