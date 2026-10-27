import { BadRequestException, type PipeTransform } from '@nestjs/common';

import { createZodValidationPipe } from 'nestjs-zod';
import { ZodError } from 'zod';

import type { TApiErrorDetail } from '../type';

export const GlobalValidationPipe: new () => PipeTransform =
  createZodValidationPipe({
    createValidationException: (error: unknown) => {
      const errors: TApiErrorDetail[] =
        error instanceof ZodError
          ? error.issues.map((issue) => {
              const property = issue.path.map(String).join('.');

              return {
                ...(property && { property }),
                message: issue.message,
              };
            })
          : [];

      return new BadRequestException(errors);
    },
  });
