-- Add the account type used for private hire company owners.
ALTER TYPE "UserAccountType" ADD VALUE IF NOT EXISTS 'PRIVATE_HIRE_COMPANY';
