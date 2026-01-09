import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, QueryUsersDto } from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) { }

  async create(tenantId: string, createUserDto: CreateUserDto) {
    // Check if user with email already exists
    const existingUser = await this.repository.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = await this.repository.create(tenantId, {
      ...createUserDto,
      password: hashedPassword,
    });

    return this.sanitizeUser(user);
  }

  async findAll(tenantId: string, query: QueryUsersDto) {
    const [users, total] = await this.repository.findAll(tenantId, query);

    return {
      data: users.map(user => this.sanitizeUser(user)),
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: Math.ceil(total / (query.limit || 10)),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.repository.findOne(tenantId, id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(tenantId: string, id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    await this.findOne(tenantId, id);

    const data: any = {};

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name;
    }

    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role !== undefined) {
      data.role = updateUserDto.role;
    }

    if (updateUserDto.isActive !== undefined) {
      data.isActive = updateUserDto.isActive;
    }

    const user = await this.repository.update(tenantId, id, data);

    return this.sanitizeUser(user);
  }

  async remove(tenantId: string, id: string) {
    // Check if user exists
    await this.findOne(tenantId, id);

    // Soft delete by setting isActive to false
    const user = await this.repository.remove(tenantId, id);

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: any) {
    const { password, ...result } = user;
    return result;
  }
}

