export type VehicleType = "TWO_WHEELER" | "FOUR_WHEELER" | "BICYCLE" | "OTHER";

export type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType?: VehicleType | string | null;
  model: string;
  color: string;
  parkingSlot: string;
  villa: {
    villaNumber: string;
    block: string;
  };
};

export type VehicleForm = {
  vehicleNumber: string;
  vehicleType: VehicleType;
  model: string;
  color: string;
  parkingSlot: string;
  villaId: string;
};
