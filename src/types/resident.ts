export type Resident = {
  id: string;
  username: string | null;
  name: string;
  email: string;
  phone: string | null;
  villaId: string | null;
  villa: {
    villaNumber: string;
    block: string;
  } | null;
  type: "Owner" | "Tenant" | "Family";
  moveInDate: string | null;
  moveOutDate: string | null;
  isActive: boolean;
  daysSinceMove: number;
  createdAt: string;
};

export type ResidentStatistics = {
  totalResidents: number;
  activeResidents: number;
  inactiveResidents: number;
  owners: number;
  tenants: number;
  newThisMonth: number;
  movedOutThisMonth: number;
  occupancyRate: number;
};

/** Minimal resident reference used in booking/notice dropdowns. */
export type ResidentOption = {
  id: string;
  name: string;
  email: string;
  villa?: { villaNumber: string | null; block: string | null } | null;
};
