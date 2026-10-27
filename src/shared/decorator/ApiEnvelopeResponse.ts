import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { type ZodDto, ZodSerializerDto, createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import type { TPaginationMeta } from '../type';

const PaginationMetaSchema = z.object({
  total: z.number().int(),
  count: z.number().int(),
  offset: z.number().int(),
  limit: z.number().int(),
  currentPage: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
}) satisfies z.ZodType<TPaginationMeta>;

class PaginationMetaDto extends createZodDto(PaginationMetaSchema) {}

type TEnvelopeOptions = {
  status?: HttpStatus;
  paginated?: boolean;
};

export function ApiEnvelopeResponse(
  dto: ZodDto,
  { status = HttpStatus.OK, paginated = false }: TEnvelopeOptions = {},
) {
  const item = { $ref: getSchemaPath(dto) };

  return applyDecorators(
    ZodSerializerDto(paginated ? [dto] : dto),
    ApiExtraModels(dto, PaginationMetaDto),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: ['success', 'statusCode', 'timestamp', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          statusCode: { type: 'integer', example: status },
          timestamp: { type: 'string', format: 'date-time' },
          data: paginated ? { type: 'array', items: item } : item,
          ...(paginated && {
            meta: { $ref: getSchemaPath(PaginationMetaDto) },
          }),
        },
      },
    }),
  );
}
