import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { TermService } from './term.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { CreateTermDto } from './dto/create_term.dto';
import { UpdateTermDto } from './dto/update_term.dto';
import { TermResponseDto } from './dto/term.response.dto';

@ApiAuth()
@Controller('terms')
export class TermController {
  constructor(private readonly termService: TermService) {}

  @ApiEndpoint({
    summary: 'Crear un cuatrimestre propio',
    secured: true,
    body: { type: CreateTermDto },
    validateBody: true,
    responses: [
      { status: 201, description: 'Cuatrimestre creado', type: TermResponseDto },
      { status: 400, description: 'Cuatrimestre duplicado' },
      { status: 404, description: 'No tenés perfil en esa carrera' },
    ],
  })
  @Post()
  async create(
    @Body() dto: CreateTermDto,
    @Request() req,
  ): Promise<TermResponseDto> {
    return this.termService.create(req.user.userId, dto);
  }

  @ApiEndpoint({
    summary: 'Listar mis cuatrimestres',
    description: 'Filtra por careerId opcional; sin filtro trae todas las carreras del usuario',
    secured: true,
    queries: [{ name: 'careerId', description: 'ID de carrera', required: false }],
    responses: [
      { status: 200, description: 'Lista de cuatrimestres', type: TermResponseDto, isArray: true },
    ],
  })
  @Get()
  async findAll(
    @Request() req,
    @Query('careerId') careerId?: string,
  ): Promise<TermResponseDto[]> {
    return this.termService.findByCareer(req.user.userId, careerId ? +careerId : undefined);
  }

  @ApiEndpoint({
    summary: 'Obtener un cuatrimestre propio',
    params: [{ name: 'id', description: 'ID del cuatrimestre', required: true }],
    secured: true,
    responses: [
      { status: 200, description: 'Cuatrimestre encontrado', type: TermResponseDto },
      { status: 403, description: 'No te pertenece' },
      { status: 404, description: 'No encontrado' },
    ],
  })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req,
  ): Promise<TermResponseDto> {
    return this.termService.findOne(+id, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Actualizar un cuatrimestre propio',
    params: [{ name: 'id', description: 'ID del cuatrimestre', required: true }],
    body: { type: UpdateTermDto },
    secured: true,
    validateBody: true,
    responses: [
      { status: 200, description: 'Cuatrimestre actualizado', type: TermResponseDto },
    ],
  })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateTermDto,
    @Request() req,
  ): Promise<TermResponseDto> {
    return this.termService.update(+id, req.user.userId, updates);
  }

  @ApiEndpoint({
    summary: 'Eliminar un cuatrimestre propio (borra sus materias en cascada)',
    params: [{ name: 'id', description: 'ID del cuatrimestre', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Cuatrimestre eliminado' }],
  })
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.termService.delete(+id, req.user.userId);
    return { message: 'Term deleted successfully' };
  }
}
