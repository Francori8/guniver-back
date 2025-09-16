// src/entities/user.entity.ts
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Role } from './role.entity';
import { UserResponseDto } from 'src/modules/User/dto/user-response.dto';

@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @ManyToOne(() => Role) // ← Sin { nullable: true }, ahora es obligatorio
  role!: Role; // ← Cambiado de "?" a "!"

  @Property({ nullable: true })
  avatar?: string;

  @Property()
  isActive: boolean = true;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();

  toResponseDto(): UserResponseDto {
    return new UserResponseDto({
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      role: {
        id: this.role.id,
        name: this.role.name,
        description: this.role.description,
      },
    });
  }
}
