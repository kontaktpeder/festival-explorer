-- 1. Create location_type enum
CREATE TYPE location_type AS ENUM ('city', 'region', 'country', 'address');

-- 2. Add available_for and location fields to personas
ALTER TABLE public.personas
ADD COLUMN available_for TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN location_name TEXT,
ADD COLUMN location_type location_type,
ADD COLUMN location_lat DOUBLE PRECISION,
ADD COLUMN location_lng DOUBLE PRECISION;

-- 3. Add location fields to entities
ALTER TABLE public.entities
ADD COLUMN location_name TEXT,
ADD COLUMN location_type location_type,
ADD COLUMN location_lat DOUBLE PRECISION,
ADD COLUMN location_lng DOUBLE PRECISION;