@echo off
REM Start Vibe Finance with Neon database
set DATABASE_URL=postgresql://neondb_owner:npg_TIcnH1zYyMR0@ep-falling-star-a1encswa-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
set DIRECT_URL=postgresql://neondb_owner:npg_TIcnH1zYyMR0@ep-falling-star-a1encswa.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
npm run dev
