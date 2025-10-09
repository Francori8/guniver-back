// src/role/role.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { RoleRepository } from './role.repository';
import { Role } from './role.entity';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleRepository.findByName(
      createRoleDto.name,
    );
    if (existingRole) {
      throw new BadRequestException('Ya existe un rol con ese nombre');
    }
    const role = this.roleRepository.create(createRoleDto);

    await this.roleRepository.save(role);
    return role;
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.findAll();
  }

  async findById(id: number): Promise<Role> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new BadRequestException('Role not found');
    }
    return role;
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findByName(name);
    if (!role) {
      throw new BadRequestException('Role not found');
    }
    return role;
  }
}
