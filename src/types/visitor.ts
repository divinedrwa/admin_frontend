export type VisitorVilla = {
  villa: {
    villaNumber: string;
    block: string;
  };
};

export type PreApprovedVisitor = {
  id: string;
  name: string;
  phone: string;
  purpose?: string | null;
  validUntil?: string | null;
  villa?: {
    villaNumber: string;
  } | null;
};

export type Visitor = {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  visitorType: string;
  vehicleNumber: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  villaVisits: VisitorVilla[];
  gate: {
    name: string;
  } | null;
};
