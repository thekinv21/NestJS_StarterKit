import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';

import type { Response } from 'express';
import { Observable, map } from 'rxjs';

import { PageDto } from '../dto';
import { TApiPaginatedResponse, TApiResponse } from '../type';

type TResponse = TApiResponse | TApiPaginatedResponse | StreamableFile;

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor<
  unknown,
  TResponse
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<TResponse> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((result: unknown): TResponse => {
        if (result instanceof StreamableFile) return result;

        const base = {
          success: true as const,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
        };

        return result instanceof PageDto
          ? { ...base, data: result.items, meta: result.meta }
          : { ...base, data: result ?? null };
      }),
    );
  }
}
