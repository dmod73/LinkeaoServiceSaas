# PowerShell script to rename all invoice_* table references to appointments_* in TypeScript/JavaScript files
# Usage: Run from repo root: .\scripts\rename-invoice-to-appointments.ps1

$ErrorActionPreference = "Stop"

Write-Host "Starting table name migration: invoice_* -> appointments_*" -ForegroundColor Green

# Define the search and replace mappings
$replacements = @{
    'from("invoice_appointments")' = 'from("appointments_appointments")'
    'from("invoice_services")' = 'from("appointments_services")'
    'from("invoice_clients")' = 'from("appointments_clients")'
    'from("invoice_availability")' = 'from("appointments_availability")'
    'from("invoice_time_off")' = 'from("appointments_time_off")'
    'from("invoice_settings")' = 'from("appointments_settings")'
    "from('invoice_appointments')" = "from('appointments_appointments')"
    "from('invoice_services')" = "from('appointments_services')"
    "from('invoice_clients')" = "from('appointments_clients')"
    "from('invoice_availability')" = "from('appointments_availability')"
    "from('invoice_time_off')" = "from('appointments_time_off')"
    "from('invoice_settings')" = "from('appointments_settings')"
    'invoice_appointment_status' = 'appointments_appointment_status'
}

# Additional type/interface renames
$typeReplacements = @{
    'invoice_services:' = 'appointments_services:'
    'invoice_clients:' = 'appointments_clients:'
    'invoice_appointments:' = 'appointments_appointments:'
}

# Find all TypeScript/JavaScript files
$filesToProcess = Get-ChildItem -Path "apps\web" -Include *.ts,*.tsx,*.js,*.jsx -Recurse | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*\.next*" -and 
    $_.FullName -notlike "*dist*"
}

$filesChanged = 0
$totalReplacements = 0

foreach ($file in $filesToProcess) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileReplacements = 0

    # Apply each replacement
    foreach ($old in $replacements.Keys) {
        $new = $replacements[$old]
        if ($content -match [regex]::Escape($old)) {
            $content = $content -replace [regex]::Escape($old), $new
            $count = ([regex]::Matches($originalContent, [regex]::Escape($old))).Count
            $fileReplacements += $count
            Write-Host "  Found $count occurrences of '$old' in $($file.Name)" -ForegroundColor Yellow
        }
    }

    # Apply type replacements
    foreach ($old in $typeReplacements.Keys) {
        $new = $typeReplacements[$old]
        if ($content -match [regex]::Escape($old)) {
            $content = $content -replace [regex]::Escape($old), $new
            $count = ([regex]::Matches($originalContent, [regex]::Escape($old))).Count
            $fileReplacements += $count
            Write-Host "  Found $count type references of '$old' in $($file.Name)" -ForegroundColor Yellow
        }
    }

    # If content changed, write it back
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $filesChanged++
        $totalReplacements += $fileReplacements
        Write-Host "[UPDATED] $($file.FullName) ($fileReplacements replacements)" -ForegroundColor Cyan
    }
}

Write-Host "`nMigration complete!" -ForegroundColor Green
Write-Host "Files changed: $filesChanged" -ForegroundColor Green
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Review the changes: git diff" -ForegroundColor Yellow
Write-Host "2. Run build: pnpm -w -F @apps/web build" -ForegroundColor Yellow
Write-Host "3. Test the application manually" -ForegroundColor Yellow
