import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../../generated/prisma';
import { Role } from '../common/enums/role.enum';
import { mapRoleToPrisma, mapRoleFromPrisma } from '../common/mappers/role.mapper';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // =====================
  // REGISTER
  // =====================
  async register(dto: RegisterDto) {
    const { email, username, password } = dto;

    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) {
      throw new BadRequestException('Email уже используется.');
    }

    const existingByUsername = await this.usersService.findByUsername(username);
    if (existingByUsername) {
      throw new BadRequestException('Имя пользователя уже используется.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.usersService.createUser({
      email,
      username,
      passwordHash,
      role: mapRoleToPrisma(Role.USER),
    });

    return {
      access_token: this.generateToken(user),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: mapRoleFromPrisma(user.role),
      },
    };
  }

  // =====================
  // LOGIN
  // =====================
  async login(dto: LoginDto) {
    const { email, username, password } = dto;

    if (!email && !username) {
      throw new BadRequestException('Укажите email или username.');
    }

    const user = email
      ? await this.usersService.findByEmail(email)
      : await this.usersService.findByUsername(username!);

    if (!user) {
      throw new UnauthorizedException('Неверные данные для входа.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверные данные для входа.');
    }

    return {
      access_token: this.generateToken(user),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: mapRoleFromPrisma(user.role),
      },
    };
  }

  // =====================
  // JWT
  // =====================
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      role: mapRoleFromPrisma(user.role),
    };

    return this.jwtService.sign(payload);
  }
}
