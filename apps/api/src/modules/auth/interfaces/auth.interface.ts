export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  orgId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organization: any;
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  permissions: string[];
  sessionId: string;
}

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}