export type SOSAlert = {
  id: string;
  emergencyType: string;
  message: string | null;
  status: string;
  villa: {
    villaNumber: string;
    ownerName: string;
    block: string | null;
  };
  user: {
    name: string;
    phone: string | null;
  };
  responseTime: number | null;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};
