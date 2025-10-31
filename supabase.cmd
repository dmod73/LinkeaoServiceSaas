@echo off
setlocal
set "PNPM_BIN=%~dp0node_modules\.bin\pnpm.cmd"
if exist "%PNPM_BIN%" (
  "%PNPM_BIN%" supabase %*
) else (
  echo pnpm CLI is not installed locally. Install pnpm or add supabase CLI to your project.
  echo To install pnpm globally: npm install -g pnpm
  echo Or install supabase locally: pnpm add -D supabase
  exit /b 1
)
