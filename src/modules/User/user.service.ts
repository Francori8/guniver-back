// src/user/user.Repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { RoleRepository } from '../Role/role.repository';
import { UpdateUserDto } from './dto/update-user,dto';
import { User } from 'src/modules/User/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  toResponseDto(user: User): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      },
      // Convertir Collections a arrays
      studentProfiles: user.studentProfiles
        ? user.studentProfiles.getItems()
        : [],
      adminProfiles: user.adminProfiles ? user.adminProfiles.getItems() : [],
    });
  }
  // En tu user.service.ts
  async hashExistingPasswords() {
    const users = await this.userRepository.findAll();

    for (const user of users) {
      if (user.password && !user.password.startsWith('$2b$')) {
        // Si no está hasheada
        user.password = await bcrypt.hash(user.password, 10);
        await this.userRepository.save(user);
      }
    }

    return { message: 'Contraseñas hasheadas correctamente' };
  }
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const role = await this.roleRepository.findById(createUserDto.roleId);
    if (!role) {
      throw new NotFoundException(
        `Role with ID ${createUserDto.roleId} not found`,
      );
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role,
      isActive: true,
    });

    await this.userRepository.save(user);
    return this.toResponseDto(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAllUsers();
    return users.map((user) => this.toResponseDto(user));
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithProfiles(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toResponseDto(user);
  }

  async findByEmail(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    return this.toResponseDto(user);
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
    return this.toResponseDto(user);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.removeAndFlush(user);
  }
}
