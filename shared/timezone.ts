export function convertUtcToTimezone(utcIsoString: string | null | undefined, timezone: string): { date: string; time: string } | null {
  if (!utcIsoString) return null;
  
  try {
    const utcDate = new Date(utcIsoString);
    if (isNaN(utcDate.getTime())) return null;
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(utcDate);
    
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    const time = `${get('hour')}:${get('minute')}`;
    
    return { date, time };
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return null;
  }
}

export function convertLocalToUtc(date: string, time: string, timezone: string): string | null {
  try {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    if (!year || !month || !day || isNaN(hours) || isNaN(minutes)) return null;
    
    const guessUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    
    const getOffset = (utcMs: number): number => {
      const utcDate = new Date(utcMs);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      
      const parts = formatter.formatToParts(utcDate);
      const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
      
      const tzYear = parseInt(get('year'));
      const tzMonth = parseInt(get('month'));
      const tzDay = parseInt(get('day'));
      let tzHour = parseInt(get('hour'));
      if (tzHour === 24) tzHour = 0;
      const tzMinute = parseInt(get('minute'));
      
      const localMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0);
      return utcMs - localMs;
    };
    
    const targetMs = guessUtc.getTime();
    const offset = getOffset(targetMs);
    const utcMs = targetMs + offset;
    
    const finalOffset = getOffset(utcMs);
    if (Math.abs(finalOffset - offset) > 3600000) {
      return new Date(targetMs + finalOffset).toISOString();
    }
    
    return new Date(utcMs).toISOString();
  } catch (error) {
    console.error('UTC conversion error:', error);
    return null;
  }
}

export function getDisplayTimeForSession(
  session: { 
    startTimeUtc?: string | null; 
    endTimeUtc?: string | null;
    startTime: string;
    endTime: string | null;
    date: string;
  },
  viewerTimezone: string
): { displayDate: string; displayStartTime: string; displayEndTime: string | null } {
  if (session.startTimeUtc) {
    const startConverted = convertUtcToTimezone(session.startTimeUtc, viewerTimezone);
    const endConverted = session.endTimeUtc ? convertUtcToTimezone(session.endTimeUtc, viewerTimezone) : null;
    
    if (startConverted) {
      return {
        displayDate: startConverted.date,
        displayStartTime: startConverted.time,
        displayEndTime: endConverted?.time || session.endTime,
      };
    }
  }
  
  return {
    displayDate: session.date,
    displayStartTime: session.startTime,
    displayEndTime: session.endTime,
  };
}
