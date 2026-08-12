import { Body, Controller, Post, Request } from '@nestjs/common';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { CreateCareerRequestService } from './create-career-request.service';
import { CreateCareerRequestDto } from './create-career-request.dto';

@ApiAuth()
@Controller('career-requests')
export class CreateCareerRequestController {
  constructor(private readonly createCareerRequestService: CreateCareerRequestService) {}

  @ApiEndpoint({
    summary: 'Solicitar una carrera adicional',
    description:
      'Cualquier usuario logueado puede pedir sumar una carrera a su perfil. Un admin la revisa y aprueba manualmente.',
    secured: true,
    body: { type: CreateCareerRequestDto },
    validateBody: true,
    responses: [
      { status: 201, description: 'Solicitud registrada exitosamente' },
      { status: 400, description: 'Ya inscripto o solicitud pendiente existente' },
    ],
  })
  @Post()
  async create(@Body() dto: CreateCareerRequestDto, @Request() req) {
    return this.createCareerRequestService.execute(req.user.userId, dto);
  }
}
