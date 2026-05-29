/** Shared pagination metadata returned by paginated API endpoints. */
export type PaginationMeta = {
  total: number;
  limit: number;
  offset: number;
};

/** Wrapper for paginated API responses. */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

/** Minimal villa reference used in many entities (visitors, parcels, complaints, etc.) */
export type VillaRef = {
  villaNumber: string;
  block: string;
};

/** Villa reference that includes ownerName — used by parcels, complaints, sos-alerts, etc. */
export type VillaRefWithOwner = VillaRef & {
  ownerName: string;
};
