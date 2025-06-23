
import { useState, useCallback } from 'react';
import { LogEntry, LogEntryType } from '../types';

const MAX_LOG_ITEMS = 150;

export const useLogger = () => {
  const [appLogs, setAppLogs] = useState<LogEntry[]>([]);

  const logAppEvent = useCallback((type: LogEntryType, message: string, details?: any) => {
    const timestamp = new Date().toISOString();
    const newLog: LogEntry = { timestamp, type, message, details };
    setAppLogs(prevLogs => [newLog, ...prevLogs.slice(0, MAX_LOG_ITEMS - 1)]);
  }, []);

  return { appLogs, logAppEvent };
};
