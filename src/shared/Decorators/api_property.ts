import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Decorator que aplica @ApiProperty() a TODA la clase
 * Uso: @ApiAllProperties()
 */
export function ApiAllProperties() {
  return function (constructor: any) {
    // Crear una instancia temporal para obtener las propiedades
    const instance = new constructor();
    const properties = Object.keys(instance);

    properties.forEach((property) => {
      // Aplicar ApiProperty a cada propiedad
      applyDecorators(
        ApiProperty({
          required: true, // Asumir requerido por defecto
          example: getDefaultExample(property),
        }),
      )(constructor.prototype, property);
    });
  };
}

function getDefaultExample(propertyName: string): any {
  const examples: { [key: string]: any } = {
    email: 'usuario@ejemplo.com',
    password: 'password123',
    firstName: 'Juan',
    lastName: 'Pérez',
    name: 'Ejemplo',
    title: 'Título ejemplo',
    description: 'Descripción ejemplo',
    id: 1,
    roleId: 1,
    userId: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return examples[propertyName] || 'valor de ejemplo';
}
