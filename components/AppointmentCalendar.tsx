"use client";

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '@/lib/utils';
import { Appointment } from '@/types/appwrite.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Setup the localizer for the calendar
const locales = {
  'en-US': require('date-fns/locale/en-US')
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
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
  AGENDA: 'agenda'
};

// Custom styles for appointment status colors
const eventStyleGetter = (event: any) => {
  let style = {
    backgroundColor: '#24AE7C', // default green for scheduled
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    opacity: 0.8,
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  if (event.status === 'cancelled') {
    style.backgroundColor = '#E11D48'; // red for cancelled
  } else if (event.status === 'pending') {
    style.backgroundColor = '#F97316'; // orange for pending
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
    const { generateAppointmentCode } = require('@/lib/utils');
    
    // Use the actual implementation from utils
    const patientId = appointment.patient && appointment.patient.$id 
      ? appointment.patient.$id 
      : (appointment.userId || 'UNKNOWN');
    const appointmentId = appointment.$id || 'UNKNOWN';
    
    return generateAppointmentCode(appointmentId, patientId);
  } catch (error) {
    console.error("Error generating appointment code:", error);
    // Fallback to a basic format
    return `TEMP-${appointment.$id?.substring(0, 6) || 'UNKNOWN'}`;
  }
};

const AppointmentCalendar = ({ appointments }: AppointmentCalendarProps) => {
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateAppointments, setDateAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Group appointments by date for the view
  const appointmentsByDate = React.useMemo(() => {
    return appointments
      .filter(appointment => appointment.status !== "cancelled")
      .reduce((acc, appointment) => {
        const date = format(new Date(appointment.schedule), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(appointment);
        return acc;
      }, {} as Record<string, Appointment[]>);
  }, [appointments]);

  // Format the appointments data for the calendar - showing only day count
  const calendarEvents = React.useMemo(() => {
    // For each day that has appointments, create only ONE event to display
    return Object.entries(appointmentsByDate).map(([dateKey, dayAppointments]) => {
      const startDate = new Date(dayAppointments[0].schedule);
      const firstPatient = dayAppointments[0].patient;
      const firstPatientName = firstPatient?.name || 'Unknown Patient';
      const idNumber = firstPatient?.identificationNumber;
      const idType = firstPatient?.identificationType || 'ID';
      
      // Format the display title based on appointment count
      const title = dayAppointments.length === 1 
        ? (idNumber ? `${firstPatientName} (${idType}: ${idNumber})` : firstPatientName)
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
    });
  }, [appointmentsByDate]);

  const handleSelectEvent = (event: any) => {
    // When clicking on an event, open the day dialog instead of a specific appointment
    const clickedDate = event.start;
    
    // Find all appointments for this date
    const appointmentsOnDate = appointments.filter(appointment => 
      isSameDay(new Date(appointment.schedule), clickedDate) &&
      appointment.status !== "cancelled"
    );
    
    // Sort appointments by time
    appointmentsOnDate.sort((a, b) => 
      new Date(a.schedule).getTime() - new Date(b.schedule).getTime()
    );
    
    if (appointmentsOnDate.length > 0) {
      setSelectedDate(clickedDate);
      setDateAppointments(appointmentsOnDate);
    }
  };

  // Handle slot selection (clicking on a day)
  const handleSelectSlot = (slotInfo: any) => {
    const clickedDate = slotInfo.start;
    // Find all appointments for this date (excluding cancelled ones)
    const appointmentsOnDate = appointments.filter(appointment => 
      isSameDay(new Date(appointment.schedule), clickedDate) &&
      appointment.status !== "cancelled" // Exclude cancelled appointments
    );
    
    // Sort appointments by time
    appointmentsOnDate.sort((a, b) => 
      new Date(a.schedule).getTime() - new Date(b.schedule).getTime()
    );
    
    if (appointmentsOnDate.length > 0) {
      setSelectedDate(clickedDate);
      setDateAppointments(appointmentsOnDate);
    }
  };

  // Handle navigation to previous month
  const handlePreviousMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1));
  };

  // Handle navigation to next month
  const handleNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1));
  };

  // dayPropGetter function to style calendar cells with appointments
  const dayPropGetter = (date: Date) => {
    // Check if there are any scheduled appointments on this day
    const hasAppointments = calendarEvents.some(event => 
      isSameDay(new Date(event.start), date)
    );
  
    if (hasAppointments) {
      return {
        style: {
          border: '2px solid #24AE7C', // Green border for days with appointments
        }
      };
    }
    return {};
  };

  return (
    <div className="h-[650px] bg-dark-400 p-4 rounded-lg border border-dark-500 shadow-md">
      {/* Custom styling for the calendar to match dark theme */}
      <style jsx global>{`
        /* Calendar container */
        .rbc-calendar {
          color: #e2e8f0;
          background-color: #1a1d21;
          border-radius: 0.75rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        /* Header row with day names */
        .rbc-header {
          padding: 10px 6px;
          font-weight: 600;
          border-bottom: 1px solid #2d3748;
          color: #cbd5e0;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          background-color: #212938;
        }
        
        /* Month view cells */
        .rbc-month-view {
          border: 1px solid #2d3748;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        
        .rbc-month-row {
          border-bottom: 1px solid #2d3748;
        }
        
        .rbc-day-bg {
          border-right: 1px solid #2d3748;
          transition: background-color 0.2s ease;
        }
        
        /* Day numbers styling */
        .rbc-date-cell {
          padding: 6px 8px;
          font-weight: 500;
          font-size: 0.9rem;
          color: #cbd5e0;
          text-align: right;
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
          /* Remove the background color, border, and box-shadow */
          background-color: transparent !important;
          border: none !important;
          box-shadow: none;
        }
        
        /* Today's date cell number - keep the blue color */
        .rbc-today .rbc-date-cell {
          font-weight: 700;
          color: #3B82F6;
        }
        
        /* Keep the "TODAY" label */
        .rbc-today::after {
          content: "TODAY";
          position: absolute;
          top: 2px;
          left: 2px;
          font-size: 9px;
          font-weight: bold;
          background-color: #3B82F6;
          color: white;
          padding: 2px 4px;
          border-radius: 4px;
          opacity: 0.9;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        /* Event styles - improved contrast and readability */
        .rbc-event {
          border-radius: 4px !important;
          padding: 6px 8px;
          font-size: 0.8rem;
          font-weight: 500;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          margin: 1px 2px;
          border: none !important; /* Remove all borders */
          transition: transform 0.1s ease;
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
          border-radius: 4px !important;
        }
        
        /* Hide all "show more" links and let our custom groups handle this */
        .rbc-show-more {
          display: none !important;
        }
        
        .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
        }
        
        .rbc-event-content {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
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
          min-height: 80px;
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
          border: 2px solid #24AE7C !important;
        }
      `}</style>
      
      {/* Custom navigation controls */}
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePreviousMonth}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <h2 className="text-lg font-medium">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNextMonth}
          className="flex items-center gap-1"
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
        style={{ height: 'calc(100% - 40px)' }} // Adjust height to account for navigation
        eventPropGetter={eventStyleGetter}
        dayPropGetter={dayPropGetter}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable={true}
        views={['month']}
        defaultView={calendarViews.MONTH}
        toolbar={false}
        date={currentDate}
        onNavigate={(date: Date) => setCurrentDate(date)}
        popup={false} // Disable popup to hide show-more links
        components={{
          // Ensure that the month view doesn't try to stack events
          month: {
            // Disable built-in day showing multiple events
            dateHeader: ({ date, label }: { date: Date; label: string }) => (
              <span className="rbc-date-cell">{label}</span>
            )
          }
        }}
      />

      {/* Appointment Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              {/* Highlighted Appointment Code Section */}
              <div className="bg-blue-900/20 p-4 -mx-6 border-y border-blue-500/30 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Appointment Code</p>
                  <p className="text-xl font-bold text-blue-500">{generateAppointmentCode(selectedEvent)}</p>
                </div>
                <button 
                  className="text-blue-500 bg-blue-900/30 hover:bg-blue-900/50 p-2 rounded-md text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(generateAppointmentCode(selectedEvent));
                    alert("Code copied to clipboard!");
                  }}
                >
                  Copy Code
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Patient</p>
                  <p className="text-base font-medium">{selectedEvent.patient?.name || 'Unknown Patient'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <StatusBadge status={selectedEvent.status} />
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="text-base">{formatDateTime(selectedEvent.schedule).dateTime}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Reason</p>
                <p className="text-base">{selectedEvent.reason}</p>
              </div>

              {selectedEvent.note && (
                <div>
                  <p className="text-sm text-gray-500">Note</p>
                  <p className="text-base">{selectedEvent.note}</p>
                </div>
              )}

              {selectedEvent.status === 'cancelled' && selectedEvent.cancellationReason && (
                <div>
                  <p className="text-sm text-gray-500">Cancellation Reason</p>
                  <p className="text-base">{selectedEvent.cancellationReason}</p>
                </div>
              )}

              {selectedEvent.patient && (
                <div>
                  <p className="text-sm text-gray-500">Contact Information</p>
                  {selectedEvent.patient.identificationNumber && (
                    <p className="text-base">
                      <span className="font-medium">{selectedEvent.patient.identificationType || 'ID'}:</span> {selectedEvent.patient.identificationNumber}
                    </p>
                  )}
                  <p className="text-base">{selectedEvent.patient.phone}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Daily Appointments Dialog - shows all appointments for a selected date */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Appointments for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {dateAppointments.length} appointment{dateAppointments.length !== 1 ? 's' : ''} scheduled on this day
            </p>
            
            {dateAppointments.length === 0 ? (
              <p className="text-center py-4">No appointments for this date.</p>
            ) : (
              <div className="space-y-4">
                {dateAppointments.map((appointment) => (
                  <div 
                    key={appointment.$id} 
                    className="p-4 border border-dark-500 rounded-lg bg-dark-300 hover:bg-dark-350"
                  >
                    {/* Highlighted Appointment Code Section */}
                    <div className="bg-blue-900/20 p-2 -mx-4 -mt-4 mb-3 border-b border-blue-500/30 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Appointment Code</p>
                        <p className="text-lg font-bold text-blue-500">{generateAppointmentCode(appointment)}</p>
                      </div>
                      <button 
                        className="text-blue-500 bg-blue-900/30 hover:bg-blue-900/50 p-1.5 rounded-md text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(generateAppointmentCode(appointment));
                          alert("Code copied to clipboard!");
                        }}
                      >
                        Copy
                      </button>
                    </div>

                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-16-semibold">{appointment.patient?.name || 'Unknown Patient'}</h4>
                        <p className="text-14-regular text-dark-600">
                          {formatDateTime(appointment.schedule).timeOnly}
                        </p>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-14-regular text-dark-600">Reason</p>
                      <p className="text-14-medium">{appointment.reason}</p>
                    </div>
                    
                    {appointment.note && (
                      <div className="mt-2">
                        <p className="text-14-regular text-dark-600">Note</p>
                        <p className="text-14-medium">{appointment.note}</p>
                      </div>
                    )}
                    
                    {appointment.status === 'cancelled' && appointment.cancellationReason && (
                      <div className="mt-2">
                        <p className="text-14-regular text-dark-600">Cancellation Reason</p>
                        <p className="text-14-medium">{appointment.cancellationReason}</p>
                      </div>
                    )}
                    
                    {appointment.patient && (
                      <div className="mt-3 pt-3 border-t border-dark-500">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-12-regular text-dark-600">{appointment.patient.identificationType || 'ID'}</p>
                            <p className="text-14-regular">{appointment.patient.identificationNumber || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-12-regular text-dark-600">Phone</p>
                            <p className="text-14-regular">{appointment.patient.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentCalendar; 