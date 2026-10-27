import type { TApiErrorDetail } from '../type';

export type TAppErrorKind =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL';

export abstract class AppError extends Error {
  abstract readonly kind: TAppErrorKind;

  constructor(
    message: string,
    readonly details?: TApiErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}
