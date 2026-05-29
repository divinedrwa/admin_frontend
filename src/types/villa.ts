export type VillaUnit = {
  id: string;
  unitCode: string;
  label: string;
  isDefault: boolean;
  sortOrder?: number;
};

export type VillaResident = {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  residentType?: string | null;
  unitId?: string | null;
  unit?: { id: string; unitCode: string; label: string } | null;
};

/** Full villa object returned by GET /api/villas. */
export type Villa = {
  id: string;
  propertyId?: string;
  villaNumber: string;
  floors: number;
  area: number;
  block: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  monthlyMaintenance: number;
  units?: VillaUnit[];
  billingAccount?: { id: string; scope: string };
  users: VillaResident[];
  _count: {
    users: number;
  };
};

/** Lightweight villa reference used in dropdowns and cross-entity references. */
export type VillaOption = {
  id: string;
  villaNumber: string;
  block: string;
  ownerName: string;
  units?: Array<{ id: string; unitCode: string; label: string; isDefault: boolean }>;
};

export type VillaForm = {
  villaNumber: string;
  floors: string;
  area: string;
  block: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  monthlyMaintenance: string;
};

export type UnitRow = {
  unitCode: string;
  label: string;
};
