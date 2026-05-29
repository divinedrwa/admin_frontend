export type Incident = {
  id: string;
  title: string;
  description: string;
  severity: string;
  location?: string;
  photoUrl?: string;
  resolvedAt?: string;
  createdAt: string;
  guard: {
    name: string;
  };
};
