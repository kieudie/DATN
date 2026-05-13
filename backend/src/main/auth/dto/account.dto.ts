import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsEmail,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';

/**
 * An Account DTO object.
 */
@Expose()
export class AccountDTO {
  @ApiProperty({
    example: 'HR New',
    description: 'User full name',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Expose({ name: 'full_name' })
  full_name!: string;

  @ApiProperty({
    example: 'hr.new@admin.com',
    description: 'User email',
    required: true,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Password',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    example: '0900000004',
    description: 'User phone',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: [1],
    description: 'Role ids',
    required: true,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  roles!: number[];
}