param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]
  $Arguments
)

# Wrapper script to run local or global supabase CLI on Windows PowerShell.
# It prefers a local install at <repo>/node_modules/.bin/supabase(.cmd) but falls
# back to 'pnpm dlx supabase' or 'npx supabase' if not found.

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$localCmd = Join-Path $scriptDir "node_modules\.bin\supabase.cmd"
$localPs1 = Join-Path $scriptDir "node_modules\.bin\supabase.ps1"

if (Test-Path $localCmd) {
  & $localCmd @Arguments
  exit $LASTEXITCODE
} elseif (Test-Path $localPs1) {
  & $localPs1 @Arguments
  exit $LASTEXITCODE
} else {
  # Try pnpm dlx (works if pnpm is available)
  try {
    & pnpm dlx supabase @Arguments
    exit $LASTEXITCODE
  } catch {
    # Fallback to npx if available
    try {
      & npx supabase @Arguments
      exit $LASTEXITCODE
    } catch {
      Write-Error "Supabase CLI no encontrada localmente ni pnpm/npx disponible. Instala supabase CLI localmente (pnpm add -D supabase) o globalmente." -ErrorAction Stop
    }
  }
}
