// Add blockedTimeSlots to the Availability interface or type
export interface Availability {
  days: number[];
  startTime: number;
  endTime: number;
  holidays: Date[] | string[];
  bookingStartDate?: string;
  bookingEndDate?: string;
  maxAppointmentsPerDay?: number;
  blockedTimeSlots?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }>;
}
