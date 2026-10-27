import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';

import { AppConfigModule, AppConfigService } from '@/infrastructure/config';

import { GlobalExceptionFilter } from '@/shared/filter';
import {
  ApiResponseInterceptor,
  PageSerializerInterceptor,
} from '@/shared/interceptor';
import { HttpLoggingMiddleware } from '@/shared/middleware';
import { GlobalValidationPipe } from '@/shared/pipe';

@Module({
  imports: [
    AppConfigModule,
    /**
     * In-memory storage: counters are per process. Use a Redis storage when
     * running several instances.
     */
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            ttl: seconds(config.get('THROTTLE_TTL_SECONDS')),
            limit: config.get('THROTTLE_LIMIT'),
          },
        ],
        errorMessage: 'Too many requests, please try again later',
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_PIPE, useClass: GlobalValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: PageSerializerInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpLoggingMiddleware).forRoutes('{*path}');
  }
}
