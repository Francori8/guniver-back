import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RequirementService } from './requirement.service';
import { RequirementKind } from './requirement_group.entity';

import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { SaveRequirementGroupDto } from './dto/requirement_item.dto';
import {
  CareerSubjectRequirementsResponseDto,
  RequirementGroupResponseDto,
} from './dto/requirement_group.response.dto';

function parseKind(kind: string): RequirementKind {
  if (kind !== RequirementKind.CURSAR && kind !== RequirementKind.APROBAR) {
    throw new BadRequestException(`kind inválido: ${kind}. Debe ser cursar|aprobar`);
  }
  return kind;
}

@ApiAuth()
@Controller('career-subjects/:careerSubjectId/requirements')
export class RequirementController {
  constructor(private readonly requirementService: RequirementService) {}

  @ApiEndpoint({
    summary: 'Obtener requisitos de cursada/aprobación de una materia',
    params: [
      {
        name: 'careerSubjectId',
        description: 'ID de CareerSubject',
        required: true,
      },
    ],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Requisitos de cursar y aprobar',
        type: CareerSubjectRequirementsResponseDto,
      },
    ],
  })
  @Get()
  async get(
    @Param('careerSubjectId') careerSubjectId: string,
  ): Promise<CareerSubjectRequirementsResponseDto> {
    return this.requirementService.getByCareerSubject(+careerSubjectId);
  }

  @ApiEndpoint({
    summary: 'Reemplazar los requisitos de un kind (cursar|aprobar)',
    description:
      'Reemplazo total: borra los requisitos existentes de ese kind y crea los nuevos. No afecta al otro kind.',
    params: [
      {
        name: 'careerSubjectId',
        description: 'ID de CareerSubject',
        required: true,
      },
      { name: 'kind', description: 'cursar | aprobar', required: true },
    ],
    body: { type: SaveRequirementGroupDto },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Requisitos guardados',
        type: RequirementGroupResponseDto,
      },
      { status: 400, description: 'kind inválido o item mal formado' },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Put(':kind')
  async save(
    @Param('careerSubjectId') careerSubjectId: string,
    @Param('kind') kind: string,
    @Body() dto: SaveRequirementGroupDto,
    @Request() req,
  ): Promise<RequirementGroupResponseDto> {
    return this.requirementService.save(
      +careerSubjectId,
      parseKind(kind),
      dto,
      req.user.userId,
    );
  }
}
