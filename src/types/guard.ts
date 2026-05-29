export type Guard = {
  id: string;
  name: string;
  email?: string;
};

export type GuardShiftType = "MORNING" | "AFTERNOON" | "NIGHT";

export type GuardShift = {
  id: string;
  shiftType: GuardShiftType;
  startTime: string;
  endTime: string;
  recurringDaily?: boolean;
  recurringStartMinutes?: number | null;
  recurringEndMinutes?: number | null;
  gate: {
    name: string;
    location: string;
  };
  guard: {
    name: string;
    email: string;
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
