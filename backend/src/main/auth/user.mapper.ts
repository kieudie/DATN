import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';
import { UserLoginResponse } from './dto/user-login-response.dto';
import { UserDTO } from './dto/user.dto';

/**
 * An User mapper object.
 */
export class UserMapper {
  static fromEntityToLoginResponse(
    user: User,
    roles: Role[],
    accessToken: string,
  ): UserLoginResponse {
    const response = new UserLoginResponse();

    response.user_id = user.id;
    response.full_name = user.fullName;
    response.email = user.email;
    response.phone = user.phone;
    response.access_token = accessToken;
    response.roles = roles.map((role) => role.code);
    response.role = roles.map((role) => {
      return {
        id: role.id,
        code: role.code,
        name: role.name,
      };
    });

    return response;
  }

  static fromEntityToDTO(user: User): UserDTO {
    const userDTO = new UserDTO();
    const roles = user.userRoles?.map((item) => item.role) || [];

    userDTO.user_id = user.id;
    userDTO.full_name = user.fullName;
    userDTO.email = user.email;
    userDTO.phone = user.phone;
    userDTO.is_active = user.isActive;
    userDTO.roles = roles.map((role) => role.code);
    userDTO.role = roles.map((role) => {
      return {
        id: role.id,
        code: role.code,
        name: role.name,
      };
    });

    return userDTO;
  }
}