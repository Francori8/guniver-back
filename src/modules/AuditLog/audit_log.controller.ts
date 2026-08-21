import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { AuditLogService } from './audit_log.service';

@ApiAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.auditLogService.findAllPaginated(query.page ?? 1, query.limit ?? 20);
  }
}
