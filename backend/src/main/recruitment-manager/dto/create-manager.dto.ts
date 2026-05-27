import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ManagerPermissionScope } from 'src/common/constants/recruitment.constants';

export class CreateManagerPermissionDTO {
  @ApiProperty({
    enum: ManagerPermissionScope,
    example: ManagerPermissionScope.VIEW,
    description: 'Quyền của manager: view, approve, comment',
  })
  @IsEnum(ManagerPermissionScope)
  scope: ManagerPermissionScope;

  @ApiProperty({
    example: 'Data Engineer',
    description: 'Chuyên môn/vị trí được áp dụng quyền',
  })
  @IsString()
  specialization: string;
}

@Expose()
export class CreateManagerDTO {
  @ApiProperty({
    example: 'Nguyễn Văn A',
    required: false,
    description: 'Tên quản lý',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'manager@example.com',
    required: true,
    description: 'Email quản lý',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Có CC email hay không',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isCc?: boolean;

  @ApiProperty({
    example: 'Engineering',
    required: false,
    description: 'Tên phòng ban',
  })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @ApiProperty({
    example: 'Backend Development',
    required: false,
    description: 'Chuyên môn/lĩnh vực phụ trách',
  })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiProperty({
    example: 'Tester_1',
    required: false,
    description:
      'Techlead role, ví dụ Tester_1 sẽ được xem tất cả ứng viên thuộc position Tester',
  })
  @IsString()
  @IsOptional()
  isTechlead?: string;

  @ApiProperty({
    type: [CreateManagerPermissionDTO],
    required: false,
    description: 'Danh sách quyền của manager',
    example: [
      {
        scope: ManagerPermissionScope.VIEW,
        specialization: 'Data Engineer',
      },
      {
        scope: ManagerPermissionScope.APPROVE,
        specialization: 'Data Engineer',
      },
      {
        scope: ManagerPermissionScope.COMMENT,
        specialization: 'Data Engineer',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateManagerPermissionDTO)
  permissions?: CreateManagerPermissionDTO[];
}