// Timezone configuration for Kurdistan region of Iraq
export const TIMEZONE_CONFIG = {
  // Kurdistan region of Iraq uses UTC+3 (Arabia Standard Time)
  defaultTimezone: 'Asia/Baghdad',
  utcOffset: '+03:00',
  displayName: 'Kurdistan (UTC+3)',
  
  // Time format for display
  timeFormat: 'HH:mm',
  dateFormat: 'yyyy-MM-dd',
  dateTimeFormat: 'yyyy-MM-dd HH:mm',
  
  // Business hours in Kurdistan timezone
  businessHours: {
    start: '08:00',
    end: '18:00'
  }
};

// Helper function to get current time in Kurdistan timezone
export const getKurdistanTime = (): Date => {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE_CONFIG.defaultTimezone }));
};

// Helper function to format time in Kurdistan timezone
export const formatKurdistanTime = (date: Date): string => {
  return date.toLocaleString('en-US', { 
    timeZone: TIMEZONE_CONFIG.defaultTimezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to format date in Kurdistan timezone
export const formatKurdistanDate = (date: Date): string => {
  return date.toLocaleDateString('en-CA', { 
    timeZone: TIMEZONE_CONFIG.defaultTimezone 
  }); // Returns YYYY-MM-DD format
};

// Helper function to create a date in Kurdistan timezone
export const createKurdistanDate = (dateStr: string, timeStr: string): Date => {
  // Create date in Kurdistan timezone (UTC+3)
  const dateTimeStr = `${dateStr}T${timeStr}:00${TIMEZONE_CONFIG.utcOffset}`;
  return new Date(dateTimeStr);
};
