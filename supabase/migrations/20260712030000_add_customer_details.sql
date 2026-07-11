-- Migration: Add marital status and profession columns to customers table

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS profession TEXT;
