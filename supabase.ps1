param([Parameter(ValueFromRemainingArguments=True)])
 = Join-Path  "node_modules\.bin\supabase.ps1"
if (Test-Path ) {
  &  @Arguments
} else {
  Write-Error "Supabase CLI no esta instalada localmente. Ejecuta pnpm add -Dw supabase o habilita Corepack." -ErrorAction Stop
}
