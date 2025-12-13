type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  requestId?: string;
  clientId?: string;
  coachId?: string;
  userId?: string;
  action?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const VALID_LOG_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug'];

function getValidLogLevel(envLevel: string | undefined, defaultLevel: LogLevel): LogLevel {
  if (!envLevel) return defaultLevel;
  const normalized = envLevel.toLowerCase() as LogLevel;
  return VALID_LOG_LEVELS.includes(normalized) ? normalized : defaultLevel;
}

const isProduction = process.env.NODE_ENV === 'production';
const defaultLogLevel: LogLevel = isProduction ? 'info' : 'debug';
const currentLogLevel = getValidLogLevel(process.env.LOG_LEVEL, defaultLogLevel);

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel];
}

function formatError(error: unknown): LogEntry['error'] | undefined {
  if (!error) return undefined;
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    };
  }
  
  return {
    name: 'UnknownError',
    message: String(error),
  };
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
    ...(error ? { error: formatError(error) } : {}),
  };
}

function output(entry: LogEntry): void {
  if (isProduction) {
    const logFn = entry.level === 'error' ? console.error : 
                  entry.level === 'warn' ? console.warn : console.log;
    logFn(JSON.stringify(entry));
  } else {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error ? `\n  Error: ${entry.error.message}${entry.error.stack ? '\n  ' + entry.error.stack : ''}` : '';
    
    const logFn = entry.level === 'error' ? console.error : 
                  entry.level === 'warn' ? console.warn : console.log;
    logFn(`${prefix} ${entry.message}${contextStr}${errorStr}`);
  }
}

export const logger = {
  error(message: string, context?: LogContext, error?: unknown): void {
    if (shouldLog('error')) {
      output(createLogEntry('error', message, context, error));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      output(createLogEntry('warn', message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      output(createLogEntry('info', message, context));
    }
  },

  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      output(createLogEntry('debug', message, context));
    }
  },

  child(baseContext: LogContext) {
    return {
      error: (message: string, context?: LogContext, error?: unknown) =>
        logger.error(message, { ...baseContext, ...context }, error),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...baseContext, ...context }),
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...baseContext, ...context }),
    };
  },
};

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export type { LogLevel, LogContext, LogEntry };
