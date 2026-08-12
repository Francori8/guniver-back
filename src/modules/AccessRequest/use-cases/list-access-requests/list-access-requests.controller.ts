import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { ListAccessRequestsService } from './list-access-requests.service';
import { AccessRequestStatus } from '../../entities/access_request.entity';

@ApiAuth()
@Controller('access-requests')
export class ListAccessRequestsController {
  constructor(private readonly listAccessRequestsService: ListAccessRequestsService) {}

  @ApiEndpoint({
    summary: 'Listar solicitudes de acceso',
    description: 'Retorna las solicitudes de acceso, opcionalmente filtradas por estado',
    secured: true,
    queries: [
      { name: 'status', description: 'pending | approved | rejected', required: false },
    ],
    responses: [{ status: 200, description: 'Listado obtenido exitosamente' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  async findAll(@Query('status') status?: AccessRequestStatus) {
    return this.listAccessRequestsService.execute(status);
  }
}
