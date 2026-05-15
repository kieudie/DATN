import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsArray, IsString } from 'class-validator';

/**
 * A DTO representing a login user response.
 */
@Expose()
export class UserLoginResponse {
  @ApiProperty({ description: 'User access token' })
  @IsString()
  @Expose({ name: 'access_token' })
  access_token!: string;

  @ApiProperty({
    description: 'User roles',
    example: ['admin'],
  })
  @IsArray()
  roles!: string[];

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  full_name?: string;
}