$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "backups"
$filename = "$backupDir\solar-db_$date.sql"

if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Avvio Backup Database Cloudflare D1" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Connessione ai server in corso... attendere.`n"

# Esegue l'export del database di produzione (--remote)
npx wrangler d1 export solar-db --remote --output=$filename

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[+] Backup completato con successo!" -ForegroundColor Green
    Write-Host "[+] File salvato in: $filename" -ForegroundColor Green
} else {
    Write-Host "`n[x] Errore durante il backup. Controlla il log." -ForegroundColor Red
}
Write-Host "==========================================" -ForegroundColor Cyan
Pause
