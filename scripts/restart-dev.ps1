Write-Host "Restarting development server..." -ForegroundColor Cyan

# Stop all node processes in this directory
Write-Host "Stopping dev server..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*electro-shop*" -or $_.MainWindowTitle -like "*electro-shop*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Clean Prisma client
Write-Host "Cleaning Prisma client..." -ForegroundColor Yellow
Remove-Item -Path "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\@prisma\client" -Recurse -Force -ErrorAction SilentlyContinue

# Regenerate Prisma client
Write-Host "Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "Prisma client regenerated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting dev server..." -ForegroundColor Cyan
    Write-Host "Run: npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "Failed to regenerate Prisma client" -ForegroundColor Red
    exit 1
}
