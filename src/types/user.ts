export type UserRole = "ADMIN" | "RESIDENT" | "GUARD" | "RESIDENT_CUM_ADMIN";

export type ResidentType = "OWNER" | "TENANT" | "FAMILY_MEMBER";

export type MaintenanceBillingRole = "PRIMARY" | "EXCLUDED";

export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  residentType?: ResidentType | null;
  maintenanceBillingRole?: MaintenanceBillingRole | null;
  villaId: string | null;
  unitId?: string | null;
  linkedUnitId?: string | null;
  villa?: {
    villaNumber: string;
    block: string;
  };
  unit?: {
    id: string;
    unitCode: string;
    label: string;
  };
  moveInDate: string | null;
  isActive: boolean;
};

export type UserForm = {
  username: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  residentType: ResidentType;
  maintenanceBillingRole: MaintenanceBillingRole;
  villaId: string;
  unitId: string;
  moveInDate: string;
  isActive: boolean;
};
