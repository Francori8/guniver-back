import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { ApproveAccessRequestService } from './approve-access-request.service';
import { ApproveAccessRequestDto } from './approve-access-request.dto';

@ApiAuth()
@Controller('access-requests')
export class ApproveAccessRequestController {
  constructor(private readonly approveAccessRequestService: ApproveAccessRequestService) {}

  @ApiEndpoint({
    summary: 'Aprobar una solicitud de acceso',
    description:
      'Crea la cuenta del alumno (inactiva) y le envía un mail de invitación para activar su cuenta y definir su contraseña.',
    secured: true,
    params: [{ name: 'id', description: 'ID de la solicitud', required: true }],
    body: { type: ApproveAccessRequestDto, description: 'Universidad y carrera asignadas' },
    validateBody: true,
    responses: [
      { status: 200, description: 'Solicitud aprobada y cuenta creada' },
      { status: 400, description: 'La solicitud ya fue revisada' },
      { status: 404, description: 'Solicitud no encontrada' },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveAccessRequestDto,
    @Request() req,
  ) {
    return this.approveAccessRequestService.execute(+id, dto, req.user.userId);
  }
}
