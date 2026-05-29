export type ParcelStatus = "PENDING" | "COLLECTED" | "DELIVERED";

export type Parcel = {
  id: string;
  description: string;
  status: ParcelStatus;
  receivedAt: string;
  collectedAt: string | null;
  villa: {
    villaNumber: string;
    block: string;
    ownerName: string;
  };
};
