declare module 'react-big-calendar' {
  import { Calendar, CalendarProps, dateFnsLocalizer } from 'react-big-calendar';
  export { Calendar, CalendarProps, dateFnsLocalizer };
  export default Calendar;
}

declare module 'react-big-calendar/lib/css/react-big-calendar.css' {
  const content: any;
  export default content;
} 