import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { ZodSerializerInterceptor } from 'nestjs-zod';
import { Observable, map } from 'rxjs';

import { PageDto } from '../dto';

@Injectable()
export class PageSerializerInterceptor
  extends ZodSerializerInterceptor
  implements NestInterceptor
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    let page: PageDto<unknown> | undefined;

    const unwrapped: CallHandler = {
      handle: () =>
        next.handle().pipe(
          map((result: unknown) => {
            if (!(result instanceof PageDto)) return result;

            page = result;
            return result.items as unknown[];
          }),
        ),
    };

    return super
      .intercept(context, unwrapped)
      .pipe(
        map((serialized: unknown) =>
          page ? page.withItems(serialized as unknown[]) : serialized,
        ),
      );
  }
}
