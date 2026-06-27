-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'SANDBOX');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "MonitorStatus" AS ENUM ('PENDING', 'CONNECTED', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "DatabaseEngine" AS ENUM ('AURORA_POSTGRESQL', 'AURORA_MYSQL', 'RDS_POSTGRESQL', 'RDS_MYSQL', 'RDS_SQLSERVER', 'RDS_ORACLE');

-- CreateEnum
CREATE TYPE "DbAuthType" AS ENUM ('PASSWORD', 'IAM', 'SECRET');

-- CreateEnum
CREATE TYPE "LoginEventType" AS ENUM ('CONSOLE_LOGIN', 'CONSOLE_LOGOUT', 'ROOT_LOGIN', 'IAM_LOGIN', 'FEDERATED_LOGIN', 'FAILED_LOGIN', 'ASSUME_ROLE');

-- CreateEnum
CREATE TYPE "LoginResult" AS ENUM ('SUCCESS', 'FAILURE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('IAM', 'MFA', 'ACCESS_KEY', 'ROOT_ACCOUNT', 'ENCRYPTION', 'NETWORK', 'BACKUP', 'LOGGING', 'DATABASE', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "QueryType" AS ENUM ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE_TABLE', 'DROP_TABLE', 'ALTER_TABLE', 'GRANT', 'REVOKE', 'OTHER', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "aws_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "description" TEXT,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "region" TEXT NOT NULL DEFAULT 'us-east-1',
    "roleArn" TEXT,
    "externalId" TEXT,
    "accessKeyId" TEXT,
    "secretAccessKey" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "syncIntervalMin" INTEGER NOT NULL DEFAULT 60,
    "tags" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aws_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_databases" (
    "id" TEXT NOT NULL,
    "awsAccountId" TEXT NOT NULL,
    "dbIdentifier" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "engine" "DatabaseEngine" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 5432,
    "databaseName" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'us-east-1',
    "authType" "DbAuthType" NOT NULL DEFAULT 'PASSWORD',
    "dbUsername" TEXT,
    "dbPassword" TEXT,
    "sslEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sslCertificate" TEXT,
    "enableActivityLogs" BOOLEAN NOT NULL DEFAULT true,
    "enableAuditLogs" BOOLEAN NOT NULL DEFAULT true,
    "enableSlowQueryLogs" BOOLEAN NOT NULL DEFAULT true,
    "slowQueryThresholdMs" INTEGER NOT NULL DEFAULT 1000,
    "status" "MonitorStatus" NOT NULL DEFAULT 'PENDING',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_databases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_audits" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "awsAccountId" TEXT NOT NULL,
    "eventType" "LoginEventType" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "sourceIp" TEXT,
    "userAgent" TEXT,
    "region" TEXT,
    "mfaUsed" BOOLEAN NOT NULL DEFAULT false,
    "loginResult" "LoginResult" NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_audits" (
    "id" TEXT NOT NULL,
    "awsAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "arn" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isRoot" BOOLEAN NOT NULL DEFAULT false,
    "passwordEnabled" BOOLEAN,
    "passwordLastUsed" TIMESTAMP(3),
    "passwordLastChanged" TIMESTAMP(3),
    "passwordNextRotation" TIMESTAMP(3),
    "accessKey1Active" BOOLEAN,
    "accessKey1LastRotated" TIMESTAMP(3),
    "accessKey1LastUsed" TIMESTAMP(3),
    "accessKey2Active" BOOLEAN,
    "accessKey2LastRotated" TIMESTAMP(3),
    "accessKey2LastUsed" TIMESTAMP(3),
    "certCount" INTEGER NOT NULL DEFAULT 0,
    "policyCount" INTEGER NOT NULL DEFAULT 0,
    "groupCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iam_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_audits" (
    "id" TEXT NOT NULL,
    "awsAccountId" TEXT NOT NULL,
    "dbIdentifier" TEXT NOT NULL,
    "dbName" TEXT,
    "engine" TEXT NOT NULL,
    "engineVersion" TEXT,
    "status" TEXT NOT NULL,
    "instanceClass" TEXT,
    "multiAz" BOOLEAN NOT NULL DEFAULT false,
    "storageEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "publiclyAccessible" BOOLEAN NOT NULL DEFAULT false,
    "iamDatabaseAuthEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deletionProtection" BOOLEAN NOT NULL DEFAULT false,
    "backupRetentionPeriod" INTEGER NOT NULL DEFAULT 0,
    "allocatedStorage" INTEGER,
    "endpoint" TEXT,
    "port" INTEGER,
    "availabilityZone" TEXT,
    "securityGroupIds" TEXT[],
    "parameterGroupName" TEXT,
    "clusterIdentifier" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "database_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_activities" (
    "id" TEXT NOT NULL,
    "awsAccountId" TEXT NOT NULL,
    "dbIdentifier" TEXT NOT NULL,
    "queryType" "QueryType" NOT NULL,
    "username" TEXT,
    "databaseName" TEXT,
    "queryText" TEXT,
    "rowsAffected" INTEGER,
    "durationMs" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "clientHostname" TEXT,
    "clientPort" INTEGER,
    "sessionId" TEXT,
    "transactionId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "awsAccountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "resource" TEXT,
    "resourceType" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "remediation" TEXT,
    "awsDocUrl" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "aws_accounts_accountId_key" ON "aws_accounts"("accountId");

-- CreateIndex
CREATE INDEX "aws_accounts_status_idx" ON "aws_accounts"("status");

-- CreateIndex
CREATE INDEX "aws_accounts_isActive_idx" ON "aws_accounts"("isActive");

-- CreateIndex
CREATE INDEX "monitored_databases_awsAccountId_idx" ON "monitored_databases"("awsAccountId");

-- CreateIndex
CREATE INDEX "monitored_databases_status_idx" ON "monitored_databases"("status");

-- CreateIndex
CREATE UNIQUE INDEX "monitored_databases_awsAccountId_dbIdentifier_key" ON "monitored_databases"("awsAccountId", "dbIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "login_audits_eventId_key" ON "login_audits"("eventId");

-- CreateIndex
CREATE INDEX "login_audits_awsAccountId_idx" ON "login_audits"("awsAccountId");

-- CreateIndex
CREATE INDEX "login_audits_eventTime_idx" ON "login_audits"("eventTime");

-- CreateIndex
CREATE INDEX "login_audits_username_idx" ON "login_audits"("username");

-- CreateIndex
CREATE INDEX "login_audits_loginResult_idx" ON "login_audits"("loginResult");

-- CreateIndex
CREATE INDEX "iam_audits_awsAccountId_idx" ON "iam_audits"("awsAccountId");

-- CreateIndex
CREATE INDEX "iam_audits_riskLevel_idx" ON "iam_audits"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "iam_audits_awsAccountId_username_key" ON "iam_audits"("awsAccountId", "username");

-- CreateIndex
CREATE INDEX "database_audits_awsAccountId_idx" ON "database_audits"("awsAccountId");

-- CreateIndex
CREATE INDEX "database_audits_riskLevel_idx" ON "database_audits"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "database_audits_awsAccountId_dbIdentifier_key" ON "database_audits"("awsAccountId", "dbIdentifier");

-- CreateIndex
CREATE INDEX "database_activities_awsAccountId_idx" ON "database_activities"("awsAccountId");

-- CreateIndex
CREATE INDEX "database_activities_dbIdentifier_idx" ON "database_activities"("dbIdentifier");

-- CreateIndex
CREATE INDEX "database_activities_queryType_idx" ON "database_activities"("queryType");

-- CreateIndex
CREATE INDEX "database_activities_recordedAt_idx" ON "database_activities"("recordedAt");

-- CreateIndex
CREATE INDEX "database_activities_success_idx" ON "database_activities"("success");

-- CreateIndex
CREATE INDEX "recommendations_awsAccountId_idx" ON "recommendations"("awsAccountId");

-- CreateIndex
CREATE INDEX "recommendations_severity_idx" ON "recommendations"("severity");

-- CreateIndex
CREATE INDEX "recommendations_status_idx" ON "recommendations"("status");

-- CreateIndex
CREATE INDEX "recommendations_category_idx" ON "recommendations"("category");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_databases" ADD CONSTRAINT "monitored_databases_awsAccountId_fkey" FOREIGN KEY ("awsAccountId") REFERENCES "aws_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_audits" ADD CONSTRAINT "login_audits_awsAccountId_fkey" FOREIGN KEY ("awsAccountId") REFERENCES "aws_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_audits" ADD CONSTRAINT "iam_audits_awsAccountId_fkey" FOREIGN KEY ("awsAccountId") REFERENCES "aws_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "database_audits" ADD CONSTRAINT "database_audits_awsAccountId_fkey" FOREIGN KEY ("awsAccountId") REFERENCES "aws_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "database_activities" ADD CONSTRAINT "database_activities_awsAccountId_fkey" FOREIGN KEY ("awsAccountId") REFERENCES "aws_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_awsAccountId_fkey" FOREIGN KEY ("awsAccountId") REFERENCES "aws_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;
