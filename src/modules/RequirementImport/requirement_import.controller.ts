import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RequirementImportService } from './requirement_import.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { ConfirmRequirementImportDto } from './dto/confirm_requirement_import.dto';
import { ConfirmRequirementImportResultDto } from './dto/confirm_requirement_import_result.dto';
import { PreviewRequirementImportResponseDto } from './dto/preview_requirement_import.response.dto';

class PreviewRequirementImportBodyDto {
  html: string;
}

@ApiAuth()
@Controller('requirement-import')
export class RequirementImportController {
  constructor(
    private readonly requirementImportService: RequirementImportService,
  ) {}

  @ApiEndpoint({
    summary:
      'Previsualizar la importación de correlativas desde el HTML del SIU (Verificar correlativas)',
    description:
      'Solo admin. No persiste nada: parsea el fragmento HTML pegado, matchea materias/módulos contra el catálogo existente y propone los requisitos de "cursar"/"aprobar"',
    secured: true,
    queries: [
      {
        name: 'careerSubjectId',
        description: 'ID de la materia (CareerSubject) de destino',
        required: true,
      },
    ],
    body: { type: PreviewRequirementImportBodyDto },
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Preview del import',
        type: PreviewRequirementImportResponseDto,
      },
      { status: 400, description: 'HTML vacío o inválido' },
      { status: 404, description: 'Materia no encontrada' },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('preview')
  async preview(
    @Query('careerSubjectId') careerSubjectId: string,
    @Body() body: PreviewRequirementImportBodyDto,
  ): Promise<PreviewRequirementImportResponseDto> {
    if (!body.html || !body.html.trim()) {
      throw new BadRequestException('Falta el HTML de correlativas');
    }
    return this.requirementImportService.buildPreview(+careerSubjectId, body.html);
  }

  @ApiEndpoint({
    summary: 'Confirmar la importación de correlativas',
    description:
      'Solo admin. Reemplaza los requisitos de "cursar"/"aprobar" de la materia con los del preview revisado',
    secured: true,
    body: { type: ConfirmRequirementImportDto },
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Resumen de la importación',
        type: ConfirmRequirementImportResultDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmRequirementImportDto,
    @Request() req,
  ): Promise<ConfirmRequirementImportResultDto> {
    return this.requirementImportService.confirmImport(dto, req.user.userId);
  }
}
