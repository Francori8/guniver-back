import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { ListCareerRequestsService } from './list-career-requests.service';
import { CareerRequestStatus } from '../../entities/career_request.entity';

@ApiAuth()
@Controller('career-requests')
export class ListCareerRequestsController {
  constructor(private readonly listCareerRequestsService: ListCareerRequestsService) {}

  @ApiEndpoint({
    summary: 'Listar solicitudes de carrera adicional',
    secured: true,
    queries: [{ name: 'status', description: 'pending | approved | rejected', required: false }],
    responses: [{ status: 200, description: 'Listado obtenido exitosamente' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  async findAll(@Query('status') status?: CareerRequestStatus) {
    return this.listCareerRequestsService.execute(status);
  }
}
