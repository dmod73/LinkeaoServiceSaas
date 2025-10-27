param([Parameter(ValueFromRemainingArguments=$true)]$Args)
$pnpmPath = Join-Path $PSScriptRoot "node_modules\.bin\pnpm.ps1"
if (Test-Path $pnpmPath) {
  & $pnpmPath @Args
} else {
  Write-Error "pnpm CLI is not installed locally. Run `npm install -g pnpm` or `corepack enable pnpm`."
}
