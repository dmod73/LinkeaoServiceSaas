@echo off
setlocal
set "PNPM_BIN=%~dp0node_modules\.bin\pnpm.cmd"
if exist "%PNPM_BIN%" (
  "%PNPM_BIN%" supabase %*
) else (
  echo pnpm CLI is not installed locally. Run 
pm install -g pnpm o corepack enable pnpm.
  exit /b 1
)
