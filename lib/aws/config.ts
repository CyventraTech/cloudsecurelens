// lib/aws/config.ts
// Central AWS SDK configuration. Credentials are pulled from environment
// variables only — never hardcoded. In production, use IAM roles instead
// of static credentials.

import type { AWSCredentials } from "@/types";

/**
 * Build AWS SDK client config.
 * In production (on EC2/ECS/Lambda), omit credentials entirely and let
 * the AWS SDK resolve them via the instance metadata service (IMDSv2).
 */
export function getAWSConfig(): AWSCredentials {
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new Error("AWS_REGION environment variable is not set.");
  }

  // In production, rely on IAM role — don't pass static credentials.
  if (process.env.NODE_ENV === "production" && !process.env.AWS_ACCESS_KEY_ID) {
    return { region };
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in development."
    );
  }

  return { region, accessKeyId, secretAccessKey };
}

export const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
export const AWS_CLOUDTRAIL_LOG_GROUP =
  process.env.AWS_CLOUDTRAIL_LOG_GROUP ?? "/aws/cloudtrail";
export const AWS_RDS_CLUSTER_IDENTIFIER =
  process.env.AWS_RDS_CLUSTER_IDENTIFIER ?? "";
