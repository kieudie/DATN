import { Role } from '../../../entities/role';
import { RoleDto } from './role.dto';

/**
 * A Role mapper object.
 */
export class RoleMapper {
  static fromEntityToDTO(role: Role): RoleDto {
    const roleDto = new RoleDto();

    roleDto.id = role.id;
    roleDto.code = role.code;
    roleDto.name = role.name;

    return roleDto;
  }
}