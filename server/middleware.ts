import type { Request, Response, NextFunction } from 'express';
import { logger, generateRequestId, type LogContext } from './logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: ReturnType<typeof logger.child>;
    }
  }
}

export function requestLogging(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  req.requestId = requestId;
  
  const context: LogContext = {
    requestId,
    method: req.method,
    path: req.path,
  };
  
  req.log = logger.child(context);
  
  const originalEnd = res.end;
  res.end = function(this: Response, ...args: any[]) {
    const duration = Date.now() - startTime;
    const logContext: LogContext = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    };
    
    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', logContext);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logContext);
    } else {
      logger.info('Request completed', logContext);
    }
    
    return originalEnd.apply(this, args as any);
  };
  
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const context: LogContext = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
  };
  
  logger.error('Unhandled error', context, err);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.requestId,
    });
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
  });
  
  res.status(404).json({
    error: 'Not found',
    requestId: req.requestId,
  });
}
