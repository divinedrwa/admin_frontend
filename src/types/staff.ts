export type StaffType = "MAID" | "COOK" | "DRIVER" | "GUARD" | "OTHER";

export type StaffAssignment = {
  id: string;
  villa: {
    villaNumber: string;
    block: string;
  };
  startDate: string;
  isActive: boolean;
};

export type Staff = {
  id: string;
  name: string;
  type: StaffType;
  phone: string;
  isActive: boolean;
  assignments: StaffAssignment[];
};

export type StaffForm = {
  name: string;
  type: StaffType;
  phone: string;
  address: string;
  villaIds: string[];
};
