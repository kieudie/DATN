import type { Request as ExpressRequest } from 'express';

export interface RequestUser {
  user_id: number;
  email: string;
  roles: string[];
}

export interface Request extends ExpressRequest {
  user?: RequestUser;
}