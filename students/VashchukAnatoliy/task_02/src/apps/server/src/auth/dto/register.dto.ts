import { IsEmail, IsNotEmpty, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Имя пользователя (латиница, цифры, подчёркивание)',
    example: 'john_doe',
    minLength: 3,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty({ message: 'Введите корректное имя пользователя (латиница, цифры, подчёркивание).' })
  @MinLength(3, {
    message: 'Введите корректное имя пользователя (латиница, цифры, подчёркивание).',
  })
  @MaxLength(32, {
    message: 'Введите корректное имя пользователя (латиница, цифры, подчёркивание).',
  })
  @Matches(/^[A-Za-z0-9_]{3,32}$/, {
    message: 'Введите корректное имя пользователя (латиница, цифры, подчёркивание).',
  })
  username: string;

  @ApiProperty({
    description: 'Email пользователя',
    example: 'john@example.com',
  })
  @IsEmail({}, { message: 'Введите корректный email.' })
  email: string;

  @ApiProperty({
    description: 'Пароль (минимум 6 символов)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Введите пароль (не менее 6 символов).' })
  password: string;
}
