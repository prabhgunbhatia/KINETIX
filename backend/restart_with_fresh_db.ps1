# PowerShell script to restart backend with fresh database
# This will stop any running backend processes and delete the database

Write-Host "Stopping backend server..." -ForegroundColor Yellow

# Find and stop any Python processes running uvicorn
$uvicornProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*app.main*"
}

if ($uvicornProcesses) {
    Write-Host "Found running uvicorn processes, stopping them..." -ForegroundColor Yellow
    $uvicornProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Delete the database file
$dbPath = "backend\lactate_lift.db"
if (Test-Path $dbPath) {
    Write-Host "Deleting database file..." -ForegroundColor Yellow
    Remove-Item $dbPath -Force -ErrorAction SilentlyContinue
    Write-Host "Database file deleted successfully!" -ForegroundColor Green
} else {
    Write-Host "Database file not found (already deleted or doesn't exist)" -ForegroundColor Yellow
}

Write-Host "`nDatabase has been reset. You can now restart the backend server." -ForegroundColor Green
Write-Host "Run: cd backend; python -m uvicorn app.main:app --reload" -ForegroundColor Cyan



