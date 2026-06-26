// Cloud SecureLens — Global Type Definitions

import type {
  User,
  LoginAudit,
  IAMAudit,
  DatabaseAudit,
  DatabaseActivity,
  Recommendation,
  AuditLog,
  UserRole,
  LoginEventType,
  LoginResult,
  RiskLevel,
  Severity,
  RecommendationStatus,
  RecommendationCategory,
  QueryType,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type {
  User,
  LoginAudit,
  IAMAudit,
  DatabaseAudit,
  DatabaseActivity,
  Recommendation,
  AuditLog,
  UserRole,
  LoginEventType,
  LoginResult,
  RiskLevel,
  Severity,
  RecommendationStatus,
  RecommendationCategory,
  QueryType,
};

// ============================================================
// API Response Wrapper
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardStats {
  securityScore: number;
  totalIamUsers: number;
  auroraDatabases: number;
  failedLoginsLast24h: number;
  criticalAlerts: number;
  openRecommendations: number;
  mfaDisabledUsers: number;
  publicDatabases: number;
  inactiveUsers: number;
  rootAccountUsage: boolean;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DashboardCharts {
  loginTrend: TrendDataPoint[];
  failedLoginTrend: TrendDataPoint[];
  databaseActivityTrend: TrendDataPoint[];
  topSourceIps: Array<{ ip: string; count: number; country?: string }>;
  iamActivityBreakdown: Array<{ category: string; count: number }>;
  queryTypeDistribution: Array<{ type: string; count: number; percentage: number }>;
}

// ============================================================
// Login Audit Types
// ============================================================

export interface LoginAuditFilters extends PaginationParams {
  eventType?: LoginEventType;
  loginResult?: LoginResult;
  username?: string;
  sourceIp?: string;
  region?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface LoginAuditWithFormatted extends LoginAudit {
  formattedDate?: string;
  formattedTime?: string;
}

// ============================================================
// IAM Types
// ============================================================

export interface IAMSummary {
  totalUsers: number;
  mfaEnabled: number;
  mfaDisabled: number;
  rootMfaEnabled: boolean;
  accessKeysActive: number;
  accessKeysOlderThan90Days: number;
  inactiveUsers: number;
  usersWithAdminAccess: number;
}

export interface IAMAuditFilters extends PaginationParams {
  mfaEnabled?: boolean;
  isRoot?: boolean;
  isActive?: boolean;
  riskLevel?: RiskLevel;
}

// ============================================================
// Database Audit Types
// ============================================================

export interface DatabaseAuditFilters extends PaginationParams {
  storageEncrypted?: boolean;
  publiclyAccessible?: boolean;
  iamDatabaseAuthEnabled?: boolean;
  riskLevel?: RiskLevel;
}

// ============================================================
// Database Activity Types
// ============================================================

export interface DatabaseActivityFilters extends PaginationParams {
  dbIdentifier?: string;
  queryType?: QueryType;
  success?: boolean;
  username?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DatabaseActivityStats {
  totalQueries: number;
  failedQueries: number;
  activeConnections: number;
  slowQueries: number;
  avgDurationMs: number;
  queryTypeBreakdown: Array<{ type: QueryType; count: number }>;
  topUsers: Array<{ username: string; queryCount: number }>;
}

// ============================================================
// Recommendation Types
// ============================================================

export interface RecommendationFilters extends PaginationParams {
  severity?: Severity;
  category?: RecommendationCategory;
  status?: RecommendationStatus;
}

export interface RecommendationStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// ============================================================
// AWS Service Types
// ============================================================

export interface AWSCredentials {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface CloudTrailEvent {
  eventId: string;
  eventName: string;
  eventTime: Date;
  username: string;
  sourceIp?: string;
  userAgent?: string;
  region?: string;
  errorCode?: string;
  errorMessage?: string;
  mfaAuthenticated?: boolean;
  accountId?: string;
}

export interface IAMUserReport {
  user: string;
  arn: string;
  userCreation: string;
  passwordEnabled: string;
  passwordLastUsed: string;
  passwordLastChanged: string;
  passwordNextRotation: string;
  mfaActive: string;
  accessKey1Active: string;
  accessKey1LastRotated: string;
  accessKey1LastUsedDate: string;
  accessKey2Active: string;
  accessKey2LastRotated: string;
  accessKey2LastUsedDate: string;
  cert1Active: string;
  cert2Active: string;
}

// ============================================================
// Navigation Types
// ============================================================

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: number;
  children?: NavItem[];
}

// ============================================================
// Chart Types
// ============================================================

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  [key: string]: string | number;
}
