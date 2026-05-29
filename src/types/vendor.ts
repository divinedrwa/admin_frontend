/** Must match Prisma `VendorCategory`. */
export type VendorCategoryId =
  | "PLUMBER"
  | "ELECTRICIAN"
  | "CARPENTER"
  | "PAINTER"
  | "CLEANER"
  | "SECURITY"
  | "OTHER";

export type Vendor = {
  id: string;
  name: string;
  category: VendorCategoryId;
  phone: string;
  email: string | null;
  description: string | null;
  /** API may omit — always coerce before controlled inputs */
  isApproved?: boolean | null;
};

export type VendorForm = {
  name: string;
  category: VendorCategoryId;
  phone: string;
  email: string;
  description: string;
  isApproved: boolean;
};
