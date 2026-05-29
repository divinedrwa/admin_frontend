export type InvitationRow = {
  id: string;
  role: string;
  phone: string | null;
  email: string | null;
  villaId: string | null;
  villa: { villaNumber: string; block: string | null } | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
};
