import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = performance.now();

    response.once('finish', () => {
      const { statusCode } = response;
      const duration: number = Math.round(performance.now() - startedAt);

      const line: string = `${request.method} ${request.originalUrl} ${statusCode} ${duration}ms`;

      if (statusCode >= 500) this.logger.error(line);
      else if (statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }
}
