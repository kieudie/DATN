export enum SORT {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const ARR_HEADER_REQUEST = [
  { name: 'page', description: '1' },
  { name: 'size', description: '20' },
  { name: 'active', description: 'id' },
  { name: 'direction', description: 'ASC' },
];

export enum ROLE {
  USER = 'user',
  ADMIN = 'admin',
  ANONYMOUS = 'anonymous',
  MANAGER = 'manager',
  REPORTER = 'reporter',
  VIEW_PERSONNEL_INFO = 'view_personnel_info',
  PERSONNEL_REVIEW = 'personnel_review',
  VIEW_HR = 'view_hr',
  VIEW_STATISTIC = 'view_statistic',
  RECRUITMENT_MANAGEMENT = 'recruitment_management',
  RECRUITMENT_MANAGER = 'recruitment_manager',
}

export enum KEYCACHEPATH {
  LOGIN_KEY = 'auth',
  USER = 'user',
  ROLE = 'role',
  PAGE = 'page',
  ROLE_PAGE = 'role_page',
  MENU = 'menu',
  RECRUITMENT = 'recruitment',
}

export enum KEYCACHEAPINAME {
  LOGIN = 'login',
  LOGOUT = 'logout',
  USER_LIST = 'user_list',
  ROLE_LIST = 'role_list',
  PAGE_LIST = 'page_list',
  ROLE_PAGE_LIST = 'role_page_list',
  MENU = 'menu',
  REGISTER = 'register',
}

export enum AccessLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

/**
 * Giữ form dự án cũ: message là code số.
 * Frontend hoặc tài liệu sẽ map code này ra text.
 */
export const MESSAGE = {
  SIGNED: 1,
  REGISTER_SUCCESS: 2,
  SERVER_ERROR: 3,

  ID_NOT_EXIST: 9,
  DATA_NOT_FOUND: 10,
  INVALID_ID: 23,
  DATA_DELETED: 38,

  ACCOUNT_ERROR: 35,
  ACCOUNT_NOT_FOUND: 36,
  ACCOUNT_DELETE_ERROR: 37,
  ACCOUNT_ROLE_CAN_NOT_DELETE: 39,
  ACCOUNT_CAN_NOT_UPDATE: 40,
  ACCOUNT_UPDATE_ERROR: 41,
  EMAIL_NOT_NULL: 42,
  PASSWORD_CHANGED: 44,
  PASSWORD_CAN_NOT_RESET: 45,
  ACCOUNT_UPDATE_SUCCESS: 69,
  EMAIL_ALREADY_USE: 71,
  INVALID_LOGIN_NAME: 72,
  INVALID_LOGIN_PASSWORD: 73,
  INVALID_LOGIN_NAME_OR_PASSWORD: 74,
  ACCOUNT_NOT_ACTIVE: 75,
  EMAIL_NOT_FOUND: 101,
  TOKEN_ERROR: 102,
  ACCOUNT_EMAIL_NOT_FOUND: 103,

  ROLE_ALREADY_EXIST: 52,
  ROLE_CREATE_SUCCESS: 53,
  ROLE_CREATE_ERROR: 54,
  ROLE_NAME_REQUIRED: 55,
  ROLE_NOT_FOUND: 56,
  ROLE_UPDATE_SUCCESS: 57,
  ROLE_UPDATE_ERROR: 58,
  ROLE_DELETE_ERROR: 59,

  USER_NOT_EXIST: 60,
  USER_NOT_FOUND: 60,

  PERMISSION_DENIED: 160,

  PAGE_CREATED_SUCCESS: 166,
  ROLE_PAGE_CREATED_SUCCESS: 167,
  PAGE_NOT_FOUND: 168,

  LOGOUT_SUCCESS: 169,
  TOKEN_LOGGED_OUT: 170,
  TOKEN_INVALID: 171,

  RECRUITMENT_ORDER_NOT_FOUND: 180,
  RECRUITMENT_CANDIDATE_NOT_FOUND: 181,
  RECRUITMENT_PIPELINE_NOT_FOUND: 182,
  RECRUITMENT_MANAGER_NOT_FOUND: 183,
  RECRUITMENT_REPORT_NOT_FOUND: 184,

  MENU_NOT_FOUND: 190,
};