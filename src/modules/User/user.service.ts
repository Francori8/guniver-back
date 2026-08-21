// src/user/user.Repository.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { RoleRepository } from '../Role/role.repository';
import { UpdateUserDto } from './dto/update-user,dto';
import { User } from 'src/modules/User/user.entity';
import { PaginatedResult } from 'src/shared/Types/paginated-result';
import { AuditLogService } from '../AuditLog/audit_log.service';
import { AuditAction, AuditEntityType } from '../AuditLog/audit_log.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly auditLogService: AuditLogService,
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
  async createUser(
    createUserDto: CreateUserDto,
    actorUserId: number,
  ): Promise<UserResponseDto> {
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
    await this.auditLogService.log(
      actorUserId,
      AuditAction.CREATE,
      AuditEntityType.USER,
      user.id,
      { email: user.email },
    );
    return this.toResponseDto(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAllUsers();
    return users.map((user) => this.toResponseDto(user));
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const { data, total } = await this.userRepository.findUsersPaginated(
      page,
      limit,
    );
    return {
      data: data.map((user) => this.toResponseDto(user)),
      total,
      page,
      limit,
    };
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
    actorUserId: number,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithProfiles(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { roleId, password, ...rest } = updates;
    const previousRoleName = user.role.name;
    let roleChanged = false;

    if (roleId) {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID ${roleId} not found`);
      }
      roleChanged = role.name !== previousRoleName;
      user.role = role;
    }

    this.userRepository.assign(user, rest, { ignoreUndefined: true });
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    await this.userRepository.save(user);

    if (roleChanged) {
      await this.auditLogService.log(
        actorUserId,
        AuditAction.ROLE_CHANGE,
        AuditEntityType.USER,
        user.id,
        { from: previousRoleName, to: user.role.name },
      );
    } else {
      await this.auditLogService.log(
        actorUserId,
        AuditAction.UPDATE,
        AuditEntityType.USER,
        user.id,
      );
    }

    return this.toResponseDto(user);
  }

  async deleteUser(id: number, actorUserId: number): Promise<void> {
    const user = await this.userRepository.findByIdWithProfiles(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    for (const profile of user.studentProfiles.getItems()) {
      this.userRepository.em.remove(profile);
    }
    for (const profile of user.adminProfiles.getItems()) {
      this.userRepository.em.remove(profile);
    }
    this.userRepository.em.remove(user);
    await this.userRepository.em.flush();

    await this.auditLogService.log(
      actorUserId,
      AuditAction.DELETE,
      AuditEntityType.USER,
      id,
    );
  }
}
