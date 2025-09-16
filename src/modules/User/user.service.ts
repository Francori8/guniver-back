// src/user/user.Repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';

import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { RoleRepository } from '../Roles/role.repository';
import { UpdateUserDto } from './dto/update-user,dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const role = await this.roleRepository.findById(createUserDto.roleId);
    if (!role) {
      throw new NotFoundException(
        `Role with ID ${createUserDto.roleId} not found`,
      );
    }

    const user = this.userRepository.create({
      ...createUserDto,
      role,
      isActive: true,
    });

    await this.userRepository.save(user);
    return user.toResponseDto();
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAllUsers();
    return users.map((user) => user.toResponseDto());
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithRole(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user.toResponseDto();
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    return user.toResponseDto();
  }

  async updateUser(
    id: number,
    updates: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithRole(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updates.roleId) {
      const role = await this.roleRepository.findById(updates.roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID ${updates.roleId} not found`);
      }
      user.role = role;
    }

    Object.assign(user, updates);
    await this.userRepository.save(user);
    return user.toResponseDto();
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.removeAndFlush(user);
  }
}
