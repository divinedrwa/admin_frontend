export type Guard = {
  id: string;
  name: string;
  email?: string;
};

export type GuardShiftType = "MORNING" | "EVENING" | "NIGHT";

export type GuardShift = {
  id: string;
  shiftType: GuardShiftType;
  startTime: string;
  endTime: string;
  recurringDaily?: boolean;
  recurringStartMinutes?: number | null;
  recurringEndMinutes?: number | null;
  contactPhone?: string | null;
  gate: {
    name: string;
    location: string;
  };
  guard: {
    name: string;
    email: string;
    phone?: string | null;
  };
};

export type ShiftForm = {
  guardId: string;
  gateId: string;
  shiftType: GuardShiftType;
  date: string;
  startTime: string;
  endTime: string;
  repeatDaily: boolean;
  contactPhone: string;
};

export type RosterForm = {
  guardId: string;
  gateId: string;
  shiftDurationHours: 8 | 12;
  dayStartTime: string;
  contactPhones: string[];
  notes: string;
  replaceExisting: boolean;
};

export type GuardPatrol = {
  id: string;
  checkpointName: string;
  checkpointLocation: string;
  scheduledTime: string;
  actualTime?: string;
  status: string;
  notes?: string;
  createdAt: string;
  guard: {
    name: string;
  };
  gate: {
    name: string;
  };
};
