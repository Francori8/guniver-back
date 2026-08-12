import { Body, Controller, Post } from '@nestjs/common';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { CreateAccessRequestService } from './create-access-request.service';
import { CreateAccessRequestDto } from './create-access-request.dto';

@Controller('access-requests')
export class CreateAccessRequestController {
  constructor(private readonly createAccessRequestService: CreateAccessRequestService) {}

  @ApiEndpoint({
    summary: 'Solicitar acceso a Guniverse',
    description:
      'Endpoint público para que un futuro alumno pida acceso. Un admin la revisa y aprueba manualmente.',
    body: {
      type: CreateAccessRequestDto,
      description: 'Datos del interesado',
    },
    validateBody: true,
    responses: [
      { status: 201, description: 'Solicitud registrada exitosamente' },
      { status: 400, description: 'Datos de entrada inválidos' },
    ],
  })
  @Post()
  async create(@Body() dto: CreateAccessRequestDto) {
    return this.createAccessRequestService.execute(dto);
  }
}
