import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'Email для входа',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Имя пользователя для входа',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: 'Пароль',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Введите пароль.' })
  password: string;
}
