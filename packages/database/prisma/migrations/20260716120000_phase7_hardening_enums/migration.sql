-- Phase 7 hardening: extend expense and accounting reference enums
ALTER TYPE "ExpenseCategoryType" ADD VALUE IF NOT EXISTS 'INTERNET';
ALTER TYPE "ExpenseCategoryType" ADD VALUE IF NOT EXISTS 'TAXES';
ALTER TYPE "ExpenseCategoryType" ADD VALUE IF NOT EXISTS 'INSURANCE';
ALTER TYPE "ExpenseCategoryType" ADD VALUE IF NOT EXISTS 'MISCELLANEOUS';
ALTER TYPE "AccountingReferenceType" ADD VALUE IF NOT EXISTS 'MANUFACTURING_ORDER';
ALTER TYPE "AccountingReferenceType" ADD VALUE IF NOT EXISTS 'REPAIR_ORDER';
