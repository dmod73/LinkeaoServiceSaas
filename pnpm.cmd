@echo off
setlocal
set "PNPM_BIN=%~dp0node_modules\.bin\pnpm.cmd"
if exist "%PNPM_BIN%" (
  "%PNPM_BIN%" %*
) else (
  echo pnpm CLI is not installed locally. Run `npm install -g pnpm` or `corepack enable pnpm`.
  exit /b 1
)
