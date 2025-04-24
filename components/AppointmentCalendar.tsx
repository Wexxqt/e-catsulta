"use client";

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { Appointment } from "@/types/appwrite.types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Setup the localizer for the calendar
const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Define calendar views
const calendarViews = {
  MONTH: "month",
  WEEK: "week",
  DAY: "day",
  AGENDA: "agenda",
};

// Custom styles for appointment status colors
const eventStyleGetter = (event: any) => {
  let style = {
    backgroundColor: "#24AE7C", // default green for scheduled
    color: "white",
    border: "none",
    borderRadius: "4px",
    opacity: 0.8,
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  if (event.status === "cancelled") {
    style.backgroundColor = "#E11D48"; // red for cancelled
  } else if (event.status === "pending") {
    style.backgroundColor = "#F97316"; // orange for pending
  } else if (event.status === "missed") {
    style.backgroundColor = "#6B7280"; // gray for missed
  } else if (event.status === "completed") {
    style.backgroundColor = "#2563EB"; // blue for completed
  }

  return { style };
};

// Remove the first dayPropGetter function since it can't access calendarEvents

interface AppointmentCalendarProps {
  appointments: Appointment[];
}

// Add a function to generate appointment codes if they don't exist
const generateAppointmentCode = (appointment: Appointment) => {
  if (appointment.appointmentCode) {
    return appointment.appointmentCode;
  }

  try {
    // Import actual implementation from utils
    const { generateAppointmentCode } = require("@/lib/utils");

    // Use the actual implementation from utils
    const patientId =
      appointment.patient && appointment.patient.$id
        ? appointment.patient.$id
        : appointment.userId || "UNKNOWN";
    const appointmentId = appointment.$id || "UNKNOWN";

    return generateAppointmentCode(appointmentId, patientId);
  } catch (error) {
    console.error("Error generating appointment code:", error);
    // Fallback to a basic format
    return `TEMP-${appointment.$id?.substring(0, 6) || "UNKNOWN"}`;
  }
};

// Function to get border color based on appointment status
const getBorderColorByStatus = (status: string) => {
  switch (status) {
    case "scheduled":
      return "border-[#24AE7C]";
    case "completed":
      return "border-[#2563EB]";
    case "cancelled":
      return "border-[#E11D48]";
    case "pending":
      return "border-[#F97316]";
    case "missed":
      return "border-[#6B7280]";
    default:
      return "border-dark-500";
  }
};

const AppointmentCalendar = ({ appointments }: AppointmentCalendarProps) => {
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateAppointments, setDateAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilters, setStatusFilters] = useState({
    scheduled: true,
    completed: true,
    cancelled: true,
    missed: true,
  });

  // Count appointments by status
  const appointmentCounts = React.useMemo(() => {
    return {
      scheduled: appointments.filter((a) => a.status === "scheduled").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      missed: appointments.filter((a) => a.status === "missed").length,
      total: appointments.length,
    };
  }, [appointments]);

  // Group appointments by date for the view
  const appointmentsByDate = React.useMemo(() => {
    // First apply status filters
    const filteredAppointments = appointments.filter((appointment) => {
      // Special handling for pending status since it's not in filters anymore
      if (appointment.status === "pending") {
        return false; // Filter out pending appointments
      }
      return statusFilters[appointment.status as keyof typeof statusFilters];
    });

    return filteredAppointments.reduce(
      (acc, appointment) => {
        const date = format(new Date(appointment.schedule), "yyyy-MM-dd");
        if (!acc[date]) acc[date] = [];
        acc[date].push(appointment);
        return acc;
      },
      {} as Record<string, Appointment[]>
    );
  }, [appointments, statusFilters]);

  // Calculate the count of currently visible appointments
  const visibleAppointmentsCount = React.useMemo(() => {
    return Object.values(appointmentsByDate).reduce((total, appointments) => {
      return total + appointments.length;
    }, 0);
  }, [appointmentsByDate]);

  // Format the appointments data for the calendar - showing only day count
  const calendarEvents = React.useMemo(() => {
    // For each day that has appointments, create only ONE event to display
    return Object.entries(appointmentsByDate).map(
      ([dateKey, dayAppointments]) => {
        const startDate = new Date(dayAppointments[0].schedule);
        const firstPatient = dayAppointments[0].patient;
        const firstPatientName = firstPatient?.name || "Unknown Patient";
        const idNumber = firstPatient?.identificationNumber;
        const idType = firstPatient?.identificationType || "ID";

        // Format the display title based on appointment count
        const title =
          dayAppointments.length === 1
            ? idNumber
              ? `${firstPatientName} (${idType}: ${idNumber})`
              : firstPatientName
            : `+${dayAppointments.length - 1} more`;

        // Return a single consolidated event for this day
        return {
          id: dateKey,
          title,
          start: startDate,
          end: new Date(startDate.getTime() + 30 * 60000),
          status: dayAppointments[0].status,
          appointments: dayAppointments,
          allDay: false, // Important to ensure proper rendering
        };
      }
    );
  }, [appointmentsByDate]);

  // Toggle a specific status filter
  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) => ({
      ...prev,
      [status]: !prev[status as keyof typeof prev],
    }));
  };

  // Handle selecting all filters
  const selectAllFilters = () => {
    setStatusFilters({
      scheduled: true,
      completed: true,
      cancelled: true,
      missed: true,
    });
  };

  // Handle clearing all filters
  const clearAllFilters = () => {
    setStatusFilters({
      scheduled: false,
      completed: false,
      cancelled: false,
      missed: false,
    });
  };

  const handleSelectEvent = (event: any) => {
    // When clicking on an event, open the day dialog instead of a specific appointment
    const clickedDate = event.start;

    // Find all appointments for this date
    const appointmentsOnDate = appointments.filter((appointment) =>
      isSameDay(new Date(appointment.schedule), clickedDate)
    );

    // Sort appointments by time
    appointmentsOnDate.sort(
      (a, b) => new Date(a.schedule).getTime() - new Date(b.schedule).getTime()
    );

    if (appointmentsOnDate.length > 0) {
      setSelectedDate(clickedDate);
      setDateAppointments(appointmentsOnDate);
    }
  };

  // Handle slot selection (clicking on a day)
  const handleSelectSlot = (slotInfo: any) => {
    const clickedDate = slotInfo.start;
    // Find all appointments for this date (including all statuses)
    const appointmentsOnDate = appointments.filter((appointment) =>
      isSameDay(new Date(appointment.schedule), clickedDate)
    );

    // Sort appointments by time
    appointmentsOnDate.sort(
      (a, b) => new Date(a.schedule).getTime() - new Date(b.schedule).getTime()
    );

    if (appointmentsOnDate.length > 0) {
      setSelectedDate(clickedDate);
      setDateAppointments(appointmentsOnDate);
    }
  };

  // Handle navigation to previous month
  const handlePreviousMonth = () => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  };

  // Handle navigation to next month
  const handleNextMonth = () => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
  };

  // dayPropGetter function to style calendar cells with appointments
  const dayPropGetter = (date: Date) => {
    // Check if there are any appointments on this day (regardless of status)
    const hasAppointments = calendarEvents.some((event) =>
      isSameDay(new Date(event.start), date)
    );

    if (hasAppointments) {
      return {
        style: {
          border: "2px solid #24AE7C", // Green border for days with appointments
        },
      };
    }
    return {};
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls - Now outside the calendar */}
      <div className="p-5 bg-dark-400 rounded-lg border border-dark-500 shadow-md">
        <style jsx global>{`
          /* Filter buttons styling */
          .filter-section {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .filter-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .filter-container {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: center;
          }

          .filter-card {
            position: relative;
            flex: 1;
            min-width: 120px;
            max-width: 200px;
            border-radius: 8px;
            overflow: hidden;
            background-color: #1a1d21;
            border: 1px solid rgba(74, 85, 104, 0.4);
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 12px;
          }

          .filter-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }

          .filter-card.active {
            border-width: 2px;
          }

          .filter-card.scheduled {
            border-color: #24ae7c;
          }

          .filter-card.scheduled.active {
            background-color: rgba(36, 174, 124, 0.1);
            box-shadow: 0 0 0 1px #24ae7c;
          }

          .filter-card.completed {
            border-color: #2563eb;
          }

          .filter-card.completed.active {
            background-color: rgba(37, 99, 235, 0.1);
            box-shadow: 0 0 0 1px #2563eb;
          }

          .filter-card.cancelled {
            border-color: #e11d48;
          }

          .filter-card.cancelled.active {
            background-color: rgba(225, 29, 72, 0.1);
            box-shadow: 0 0 0 1px #e11d48;
          }

          .filter-card.missed {
            border-color: #6b7280;
          }

          .filter-card.missed.active {
            background-color: rgba(107, 114, 128, 0.1);
            box-shadow: 0 0 0 1px #6b7280;
          }

          .filter-icon-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .filter-icon {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: currentColor;
          }

          .filter-checkbox {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid currentColor;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .filter-checkbox.active::after {
            content: "";
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: currentColor;
          }

          .filter-title {
            font-size: 1rem;
            font-weight: 600;
            color: #e2e8f0;
            margin-bottom: 4px;
          }

          .filter-count {
            font-size: 0.85rem;
            color: rgba(226, 232, 240, 0.8);
          }

          .filter-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .filter-action-button {
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 0.85rem;
            background-color: #2d3748;
            color: #e2e8f0;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
          }

          .filter-action-button:hover {
            background-color: #3d4a5f;
          }

          .filter-summary {
            font-size: 0.875rem;
            color: #a0aec0;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .filter-tooltip {
            position: absolute;
            top: 0;
            right: 0;
            width: 16px;
            height: 16px;
            background-color: rgba(74, 85, 104, 0.3);
            color: #cbd5e0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            cursor: help;
          }

          /* Mobile responsive adjustments */
          @media (max-width: 768px) {
            .filter-container {
              justify-content: center;
              gap: 16px;
            }

            .filter-card {
              min-width: 140px;
              flex: 0 0 calc(50% - 16px);
            }

            .filter-actions {
              width: 100%;
              justify-content: center;
              margin-top: 16px;
            }

            .filter-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 10px;
            }

            .filter-summary {
              margin-top: 8px;
            }
          }
        `}</style>

        <div className="filter-section">
          <div className="filter-header">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Appointment Filters
            </h3>

            <div className="filter-actions">
              <button
                className="filter-action-button"
                onClick={selectAllFilters}
                title="Show all appointment types"
              >
                Show All
              </button>
              <button
                className="filter-action-button"
                onClick={clearAllFilters}
                title="Hide all appointment types"
              >
                Hide All
              </button>
            </div>
          </div>

          <div className="filter-container">
            <div
              className={`filter-card scheduled ${statusFilters.scheduled ? "active" : ""}`}
              onClick={() => toggleStatusFilter("scheduled")}
              title="Toggle scheduled appointments"
            >
              <div
                className="filter-tooltip"
                title="Upcoming appointments that are confirmed"
              >
                ?
              </div>
              <div className="filter-icon-container">
                <span
                  className="filter-icon"
                  style={{ color: "#24AE7C" }}
                ></span>
                <span
                  className={`filter-checkbox ${statusFilters.scheduled ? "active" : ""}`}
                  style={{ color: "#24AE7C" }}
                ></span>
              </div>
              <div
                className="filter-title"
                style={{
                  color: statusFilters.scheduled ? "#24AE7C" : "#e2e8f0",
                }}
              >
                Scheduled
              </div>
              <div className="filter-count">
                {appointmentCounts.scheduled} appointments
              </div>
            </div>

            <div
              className={`filter-card completed ${statusFilters.completed ? "active" : ""}`}
              onClick={() => toggleStatusFilter("completed")}
              title="Toggle completed appointments"
            >
              <div
                className="filter-tooltip"
                title="Appointments that have been completed"
              >
                ?
              </div>
              <div className="filter-icon-container">
                <span
                  className="filter-icon"
                  style={{ color: "#2563EB" }}
                ></span>
                <span
                  className={`filter-checkbox ${statusFilters.completed ? "active" : ""}`}
                  style={{ color: "#2563EB" }}
                ></span>
              </div>
              <div
                className="filter-title"
                style={{
                  color: statusFilters.completed ? "#2563EB" : "#e2e8f0",
                }}
              >
                Completed
              </div>
              <div className="filter-count">
                {appointmentCounts.completed} appointments
              </div>
            </div>

            <div
              className={`filter-card cancelled ${statusFilters.cancelled ? "active" : ""}`}
              onClick={() => toggleStatusFilter("cancelled")}
              title="Toggle cancelled appointments"
            >
              <div
                className="filter-tooltip"
                title="Appointments that were cancelled"
              >
                ?
              </div>
              <div className="filter-icon-container">
                <span
                  className="filter-icon"
                  style={{ color: "#E11D48" }}
                ></span>
                <span
                  className={`filter-checkbox ${statusFilters.cancelled ? "active" : ""}`}
                  style={{ color: "#E11D48" }}
                ></span>
              </div>
              <div
                className="filter-title"
                style={{
                  color: statusFilters.cancelled ? "#E11D48" : "#e2e8f0",
                }}
              >
                Cancelled
              </div>
              <div className="filter-count">
                {appointmentCounts.cancelled} appointments
              </div>
            </div>

            <div
              className={`filter-card missed ${statusFilters.missed ? "active" : ""}`}
              onClick={() => toggleStatusFilter("missed")}
              title="Toggle missed appointments"
            >
              <div
                className="filter-tooltip"
                title="Appointments that the patient did not attend"
              >
                ?
              </div>
              <div className="filter-icon-container">
                <span
                  className="filter-icon"
                  style={{ color: "#6B7280" }}
                ></span>
                <span
                  className={`filter-checkbox ${statusFilters.missed ? "active" : ""}`}
                  style={{ color: "#6B7280" }}
                ></span>
              </div>
              <div
                className="filter-title"
                style={{ color: statusFilters.missed ? "#6B7280" : "#e2e8f0" }}
              >
                Missed
              </div>
              <div className="filter-count">
                {appointmentCounts.missed} appointments
              </div>
            </div>
          </div>

          <div className="filter-summary">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Showing {visibleAppointmentsCount} of {appointmentCounts.total}{" "}
            appointments
          </div>
        </div>
      </div>

      {/* Calendar Component */}
      <div className="h-[650px] bg-dark-400 p-4 rounded-lg border border-dark-500 shadow-md">
        {/* Custom styling for the calendar to match dark theme */}
        <style jsx global>{`
          /* Calendar container */
          .rbc-calendar {
            color: #e2e8f0;
            background-color: #1a1d21;
            border-radius: 0.85rem;
            font-family:
              "Inter",
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              Roboto,
              Helvetica,
              Arial,
              sans-serif;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            border: 1px solid rgba(45, 55, 72, 0.5);
            transition: all 0.2s ease;
          }

          /* Header row with day names */
          .rbc-header {
            padding: 12px 8px;
            font-weight: 600;
            border-bottom: 1px solid rgba(45, 55, 72, 0.7);
            color: #cbd5e0;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            background-color: #212938;
            height: 44px;
          }

          /* Month view cells */
          .rbc-month-view {
            border: none;
            border-radius: 0.75rem;
            overflow: hidden;
            margin-top: 0.5rem;
          }

          .rbc-month-row {
            border-bottom: 1px solid rgba(45, 55, 72, 0.5);
          }

          .rbc-day-bg {
            border-right: 1px solid rgba(45, 55, 72, 0.5);
            transition: background-color 0.2s ease;
            position: relative;
          }

          /* Day numbers styling */
          .rbc-date-cell {
            padding: 8px 10px;
            font-weight: 500;
            font-size: 0.9rem;
            color: #cbd5e0;
            text-align: right;
            z-index: 2;
            position: relative;
          }

          /* Off-range days (previous/next month) */
          .rbc-off-range {
            color: #4a5568;
            opacity: 0.6;
          }

          .rbc-off-range-bg {
            background-color: rgba(26, 32, 44, 0.4);
          }

          /* Today's date - minimal highlighting */
          .rbc-today {
            position: relative;
            background-color: rgba(66, 153, 225, 0.07) !important;
            border: none !important;
            box-shadow: none;
          }

          /* Today's date cell number - keep the blue color */
          .rbc-today .rbc-date-cell {
            font-weight: 700;
            color: #3b82f6;
          }

          /* Keep the "TODAY" label */
          .rbc-today::after {
            content: "TODAY";
            position: absolute;
            top: 2px;
            left: 2px;
            font-size: 9px;
            font-weight: bold;
            background-color: #3b82f6;
            color: white;
            padding: 2px 4px;
            border-radius: 4px;
            opacity: 0.9;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }

          /* Event styles - improved contrast and readability */
          .rbc-event {
            border-radius: 6px !important;
            padding: 8px 10px;
            font-size: 0.8rem;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
            margin: 2px 3px;
            border: none !important; /* Remove all borders */
            transition: all 0.2s ease;
            min-height: 28px;
            z-index: 3;
          }

          /* Additional rule to ensure all borders are removed */
          .rbc-event,
          .rbc-event * {
            border: none !important;
            outline: none !important;
          }

          /* Target all events in the calendar */
          .rbc-row-segment .rbc-event,
          .rbc-row-segment .rbc-event-content,
          .rbc-day-slot .rbc-event,
          .rbc-day-slot .rbc-event-content {
            border: none !important;
            outline: none !important;
            border-radius: 6px !important;
          }

          /* Hide all "show more" links and let our custom groups handle this */
          .rbc-show-more {
            display: none !important;
          }

          .rbc-event:hover {
            transform: translateY(-1px) scale(1.02);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
            z-index: 10;
          }

          .rbc-event-content {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
            font-weight: 500;
            letter-spacing: 0.01em;
          }

          /* Multiple events indicator */
          .rbc-row-segment .rbc-event-content {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          /* Make date cells clickable */
          .rbc-day-bg {
            cursor: pointer;
          }

          .rbc-day-bg:hover {
            background-color: rgba(45, 55, 72, 0.5);
          }

          /* Weekend styling */
          .rbc-day-bg.rbc-off-range-bg {
            background-color: rgba(26, 32, 44, 0.4);
          }

          /* Empty cells padding */
          .rbc-row-content {
            min-height: 90px;
          }

          /* Custom month header styling */
          .custom-month-header {
            background-color: #2d3748;
            color: white;
            border-radius: 0.5rem 0.5rem 0 0;
            padding: 1rem;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          /* Highlight days with appointments */
          .has-appointments {
            border: 2px solid #24ae7c !important;
          }

          /* Status-specific event styling */
          .rbc-event.event-scheduled {
            background: linear-gradient(135deg, #24ae7c, #1c8c64) !important;
            box-shadow: 0 4px 6px rgba(36, 174, 124, 0.2);
          }

          .rbc-event.event-completed {
            background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
          }

          .rbc-event.event-cancelled {
            background: linear-gradient(135deg, #e11d48, #be1a3e) !important;
            box-shadow: 0 4px 6px rgba(225, 29, 72, 0.2);
          }

          .rbc-event.event-pending {
            background: linear-gradient(135deg, #f97316, #dc6612) !important;
            box-shadow: 0 4px 6px rgba(249, 115, 22, 0.2);
          }

          .rbc-event.event-missed {
            background: linear-gradient(135deg, #6b7280, #4b5563) !important;
            box-shadow: 0 4px 6px rgba(107, 114, 128, 0.2);
          }

          /* Custom navigation buttons */
          .calendar-nav-btn {
            background-color: #2d3748;
            color: #e2e8f0;
            border: 1px solid #4a5568;
            border-radius: 0.5rem;
            padding: 0.5rem 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
            font-weight: 500;
          }

          .calendar-nav-btn:hover {
            background-color: #3d4a5f;
            border-color: #63728b;
          }

          /* Month title */
          .calendar-month-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #e2e8f0;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }

          /* Add a subtle gradient overlay to the calendar */
          .rbc-calendar::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              180deg,
              rgba(26, 32, 44, 0.03) 0%,
              rgba(26, 32, 44, 0) 100%
            );
            pointer-events: none;
            z-index: 1;
          }

          /* Row height adjustments for better spacing */
          .rbc-row {
            min-height: 30px;
          }

          /* Hover animations for interactive elements */
          .rbc-date-cell:hover {
            color: #3b82f6;
            transition: color 0.2s ease;
          }
        `}</style>

        {/* Custom navigation controls */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            className="calendar-nav-btn"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <h2 className="calendar-month-title">
            {format(currentDate, "MMMM yyyy")}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="calendar-nav-btn"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "calc(100% - 60px)" }}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable={true}
          views={["month"]}
          defaultView={calendarViews.MONTH}
          toolbar={false}
          date={currentDate}
          onNavigate={(date: Date) => setCurrentDate(date)}
          popup={false}
          components={{
            month: {
              dateHeader: ({ date, label }: { date: Date; label: string }) => (
                <span className="rbc-date-cell">{label}</span>
              ),
            },
          }}
        />
      </div>

      {/* Appointment Details Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent
          className={`sm:max-w-[500px] border-2 ${selectedEvent ? getBorderColorByStatus(selectedEvent.status) : ""}`}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Appointment Details
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6">
              {/* Highlighted Appointment Code Section */}
              <div className="bg-blue-900/20 p-4 -mx-6 border-y border-blue-500/30 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Appointment Code</p>
                  <p className="text-xl font-bold text-blue-500">
                    {generateAppointmentCode(selectedEvent)}
                  </p>
                </div>
                <button
                  className="text-blue-500 bg-blue-900/30 hover:bg-blue-900/50 p-2 rounded-md text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      generateAppointmentCode(selectedEvent)
                    );
                    alert("Code copied to clipboard!");
                  }}
                >
                  Copy Code
                </button>
              </div>

              {/* Patient and Status Section */}
              <div className="flex justify-between items-center bg-dark-350 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-400">Patient</p>
                  <p className="text-lg font-medium">
                    {selectedEvent.patient?.name || "Unknown Patient"}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <StatusBadge status={selectedEvent.status} />
                </div>
              </div>

              {/* Date & Time Section */}
              <div className="bg-dark-350 p-4 rounded-lg border-l-4 border-yellow-500">
                <p className="text-sm text-gray-400 mb-1">Date & Time</p>
                <p className="text-base font-medium">
                  {formatDateTime(selectedEvent.schedule).dateTime}
                </p>
              </div>

              {/* Reason Section */}
              <div className="bg-dark-350 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-sm text-gray-400 mb-1">Reason</p>
                <p className="text-base">
                  {selectedEvent.reason || "No reason provided"}
                </p>
              </div>

              {/* Note Section - Conditional */}
              {selectedEvent.note && (
                <div className="bg-dark-350 p-4 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-gray-400 mb-1">Note</p>
                  <p className="text-base">{selectedEvent.note}</p>
                </div>
              )}

              {/* Cancellation Reason - Conditional */}
              {selectedEvent.status === "cancelled" &&
                selectedEvent.cancellationReason && (
                  <div className="bg-dark-350 p-4 rounded-lg border-l-4 border-red-500">
                    <p className="text-sm text-gray-400 mb-1">
                      Cancellation Reason
                    </p>
                    <p className="text-base">
                      {selectedEvent.cancellationReason}
                    </p>
                  </div>
                )}

              {/* Contact Information Section */}
              {selectedEvent.patient && (
                <div className="bg-dark-350 p-4 rounded-lg mt-2">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Contact Information
                  </p>
                  <div className="space-y-2">
                    {selectedEvent.patient.identificationNumber && (
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-2">
                          {selectedEvent.patient.identificationType || "ID"}:
                        </span>
                        <span className="font-medium">
                          {selectedEvent.patient.identificationNumber}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">Phone:</span>
                      <span className="font-medium">
                        {selectedEvent.patient.phone}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Daily Appointments Dialog - shows all appointments for a selected date */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto border-2 border-dark-500">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold mb-1">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
            </DialogTitle>
            <p className="text-sm text-gray-400">
              {dateAppointments.length} appointment
              {dateAppointments.length !== 1 ? "s" : ""} scheduled
            </p>
          </DialogHeader>

          {dateAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-dark-350 p-4 mb-4">
                <svg
                  className="h-8 w-8 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-center text-lg font-medium">
                No appointments for this date
              </p>
              <p className="text-center text-sm text-gray-400 mt-1">
                Try selecting a different date
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {dateAppointments.map((appointment) => (
                <div
                  key={appointment.$id}
                  className={`p-4 border-2 rounded-lg bg-dark-300 hover:bg-dark-350 ${getBorderColorByStatus(appointment.status)}`}
                >
                  {/* Top section with code and status */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          Code
                        </span>
                        <p className="text-lg font-bold text-blue-500">
                          {generateAppointmentCode(appointment)}
                        </p>
                      </div>
                      <h4 className="text-16-semibold mt-2">
                        {appointment.patient?.name || "Unknown Patient"}
                      </h4>
                    </div>
                    <div className="flex flex-col items-end">
                      <StatusBadge status={appointment.status} />
                    </div>
                  </div>

                  {/* Appointment details */}
                  <div className="space-y-3 mt-4">
                    {/* Time highlight */}
                    <div className="border-l-2 border-yellow-500 pl-3 py-1">
                      <p className="text-13-medium text-gray-400">Time</p>
                      <p className="text-15-medium">
                        {formatDateTime(appointment.schedule).timeOnly}
                      </p>
                    </div>

                    {/* Reason */}
                    <div className="border-l-2 border-green-500 pl-3 py-1">
                      <p className="text-13-medium text-gray-400">Reason</p>
                      <p className="text-15-medium">
                        {appointment.reason || "No reason provided"}
                      </p>
                    </div>

                    {/* Notes - if available */}
                    {appointment.note && (
                      <div className="border-l-2 border-blue-500 pl-3 py-1">
                        <p className="text-13-medium text-gray-400">Note</p>
                        <p className="text-15-medium">{appointment.note}</p>
                      </div>
                    )}

                    {/* Cancellation reason - if applicable */}
                    {appointment.status === "cancelled" &&
                      appointment.cancellationReason && (
                        <div className="border-l-2 border-red-500 pl-3 py-1">
                          <p className="text-13-medium text-gray-400">
                            Cancellation Reason
                          </p>
                          <p className="text-15-medium">
                            {appointment.cancellationReason}
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Patient details */}
                  {appointment.patient && (
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-dark-500">
                      {appointment.patient.identificationNumber && (
                        <div>
                          <p className="text-xs text-gray-500">
                            {appointment.patient.identificationType || "ID"}
                          </p>
                          <p className="text-sm font-medium">
                            {appointment.patient.identificationNumber}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium">
                          {appointment.patient.phone}
                        </p>
                      </div>
                      <button
                        className="text-blue-500 bg-blue-900/20 hover:bg-blue-900/30 p-2 rounded text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            generateAppointmentCode(appointment)
                          );
                          alert("Code copied to clipboard!");
                        }}
                      >
                        Copy Code
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentCalendar;
