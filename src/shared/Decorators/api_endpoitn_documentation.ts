import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiTags,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { UsePipes, ValidationPipe } from '@nestjs/common';

export function ApiEndpoint(options: {
  summary: string;
  description?: string;
  params?: { name: string; description: string; required?: boolean }[];
  queries?: { name: string; description: string; required?: boolean }[];
  body?: { type: Function; description?: string };
  secured?: boolean;
  tags?: string[];
  validateBody?: boolean;
  responses?: {
    status: number;
    description: string;
    type?: Function;
    isArray?: boolean;
  }[];
}) {
  const allTypes: Function[] = [];
  if (options.body?.type) allTypes.push(options.body.type);
  (options.responses || []).forEach((r) => {
    if (r.type) allTypes.push(r.type);
  });
  const decorators = [
    // Documentación Swagger

    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),

    // Agregar modelos extra si hay respuestas con DTOs
    ...(options.responses || [])
      .filter((response) => response.type)
      .map((response) => ApiExtraModels(response.type!)),

    // Parámetros en la URL
    ...(options.params || []).map((param) => ApiParam(param)),

    // Parámetros en la query
    ...(options.queries || []).map((query) => ApiQuery(query)),

    ...allTypes.map((type) => ApiExtraModels(type)),
    // Cuerpo de la petición
    options.body && typeof options.body.type === 'function'
      ? ApiBody({
          type: options.body.type,
          description: options.body.description,
        })
      : null,

    // Autenticación (si es necesario)
    options.secured ? ApiBearerAuth() : null,

    // Etiquetas para agrupar en Swagger
    options.tags ? ApiTags(...options.tags) : null,

    // Validación automática del cuerpo (DTO)
    options.validateBody ? UsePipes(new ValidationPipe()) : null,

    // Definir respuestas posibles del endpoint
    ...(options.responses || []).map((response) =>
      response.type
        ? ApiResponse({
            status: response.status,
            description: response.description,
            schema: response.isArray
              ? {
                  type: 'array',
                  items: { $ref: getSchemaPath(response.type) },
                }
              : {
                  $ref: getSchemaPath(response.type),
                },
          })
        : ApiResponse({
            status: response.status,
            description: response.description,
          }),
    ),
  ].filter((decorator) => decorator !== null); // Filtra decoradores nulos

  return applyDecorators(...decorators);
}
