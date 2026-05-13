export const RECRUITMENT_PIPELINE_CODES = {
  RECEIVED_CV: 'received_cv',
  HR_SCAN: 'hr_scan',
  IQ_TEST: 'iq_test',
  DEPARTMENT_REVIEW: 'department_review',
  TECHNICAL_TEST: 'technical_test',
  INTERVIEW_ROUND_1: 'interview_round_1',
  INTERVIEW_ROUND_2: 'interview_round_2',
  OFFER: 'offer',
  ONBOARDING: 'onboarding',
  FAIL: 'fail',
} as const;

export const PIPELINE_RESULT = {
  PASS: 'pass',
  FAIL: 'fail',
  PENDING: 'pending',
} as const;

export const EMAIL_TEMPLATE_TYPE = {
  INVITE: 'invite',
  PASS: 'pass',
  FAIL: 'fail',
  OFFER: 'offer',
} as const;

export const SCHEDULED_JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export const SCHEDULED_REF_TYPE = {
  CANDIDATE: 'candidate',
  USER: 'user',
} as const;

export const SCHEDULED_JOB_TYPE = {
  SEND_EMAIL: 'send_email',
  PUSH_NOTIFICATION: 'push_notification',
} as const;

export enum TestOnlineStatus {
  SENT = 'sent',
  PASSED = 'passed',
  NOT_ATTEMPT = 'not_attempt',
  FAILED = 'failed',
}

export enum RecruitmentOrderStatus {
  INPROGRESS = 'inprogress',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
  EXPIRED = 'expired',
}

export enum ManagerPermissionScope {
  VIEW = 'view',
  APPROVE = 'approve',
  COMMENT = 'comment',
}

export const RECRUITMENT_PAGE_CODE = {
  HOME: 'home',

  RECRUITMENT_MANAGEMENT: 'recruitment_management',
  RECRUITMENT_CANDIDATE_LIST: 'recruitment_candidate_list',
  RECRUITMENT_PIPELINE: 'recruitment_pipeline',
  RECRUITMENT_MANAGER_CANDIDATES: 'recruitment_manager_candidates',
  RECRUITMENT_MANAGER_MANAGEMENT: 'recruitment_manager_management',
  RECRUITMENT_ORDER_MANAGER: 'recruitment_order_manager',
  RECRUITMENT_ORDER_MANAGEMENT: 'recruitment_order_management',
  RECRUITMENT_ORDER_PIPELINE: 'recruitment_order_pipeline',
  RECRUITMENT_MANAGER_MY_CANDIDATE: 'recruitment_manager_my_candidate',

  RECRUITMENT_REPORT: 'recruitment_report',
  RECRUITMENT_REPORT_OVERVIEW: 'recruitment_report_overview',
  RECRUITMENT_REPORT_EFFECTIVENESS: 'recruitment_report_effectiveness',
  RECRUITMENT_REPORT_SPEED: 'recruitment_report_speed',
} as const;

export const DEFAULT_PASSWORD = '123456';

export const REDIS_KEY = {
  BLACKLIST_TOKEN: 'blacklist_token',
};