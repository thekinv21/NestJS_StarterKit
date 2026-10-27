import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type { Request, Response } from 'express';
import { ZodSerializationException } from 'nestjs-zod';
import { STATUS_CODES } from 'node:http';

import { AppError, type TAppErrorKind } from '../error';
import type { TApiErrorDetail, TApiErrorResponse } from '../type';

const VALIDATION_MESSAGE = 'Validation failed';
const INTERNAL_MESSAGE = 'Internal server error';
const SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

const APP_ERROR_STATUS: Record<TAppErrorKind, HttpStatus> = {
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  UNPROCESSABLE: HttpStatus.UNPROCESSABLE_ENTITY,
  TOO_MANY_REQUESTS: HttpStatus.TOO_MANY_REQUESTS,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
};

type TErrorPayload = {
  message: string;
  errors?: TApiErrorDetail[];
};

/**
 * Client errors raised by Express middleware before Nest sees the request
 * (body-parser: payload too large, unsupported charset, ...). They follow the
 * `http-errors` convention: `expose` is true only for safe 4xx messages.
 */

function isExposedHttpError(
  exception: unknown,
): exception is Error & { status: number } {
  return (
    exception instanceof Error &&
    (exception as { expose?: unknown }).expose === true &&
    typeof (exception as { status?: unknown }).status === 'number'
  );
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const statusCode = this.getStatus(exception);

    if (statusCode >= SERVER_ERROR_STATUS) {
      this.logServerError(exception, request);
    }

    // e.g. a streamed response failed midway — nothing left to send
    if (response.headersSent) return;

    // 5xx internals are never exposed to the client
    const { message, errors } =
      statusCode >= SERVER_ERROR_STATUS
        ? { message: INTERNAL_MESSAGE, errors: undefined }
        : this.extractPayload(exception);

    const body: TApiErrorResponse = {
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      success: false,
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'Error',
      message,
      ...(errors?.length && { errors }),
    };

    response.status(statusCode).json(body);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof AppError) return APP_ERROR_STATUS[exception.kind];
    if (exception instanceof HttpException) return exception.getStatus();
    if (isExposedHttpError(exception)) return exception.status;

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private extractPayload(exception: unknown): TErrorPayload {
    if (exception instanceof AppError) {
      return { message: exception.message, errors: exception.details };
    }

    if (isExposedHttpError(exception)) return { message: exception.message };

    if (!(exception instanceof HttpException)) {
      return { message: INTERNAL_MESSAGE };
    }

    const res = exception.getResponse();

    if (typeof res === 'string') return { message: res };

    const raw = (res as { message?: unknown }).message;

    if (Array.isArray(raw)) {
      return {
        message: VALIDATION_MESSAGE,
        errors: raw.map((item: unknown) =>
          typeof item === 'string'
            ? { message: item }
            : (item as TApiErrorDetail),
        ),
      };
    }

    return { message: typeof raw === 'string' ? raw : exception.message };
  }

  private logServerError(exception: unknown, request: Request): void {
    const context = `${request.method} ${request.originalUrl}`;

    if (exception instanceof ZodSerializationException) {
      this.logger.error(
        `${context} — response serialization failed`,
        String(exception.getZodError()),
      );
      return;
    }

    this.logger.error(
      context,
      exception instanceof Error ? exception.stack : String(exception),
    );
  }
}
