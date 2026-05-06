# Stop the script if any native PowerShell command fails
$ErrorActionPreference = "Stop"

# Helper function to check if the last external command (npm/docker) succeeded
function Check-ExitCode {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[!] ERROR: The previous command failed with exit code $LASTEXITCODE. Aborting deployment." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "--- Starting installation for intranet-fe ---" -ForegroundColor Cyan
npm install
Check-ExitCode

Write-Host "--- Starting Deployment for intranet-fe ---" -ForegroundColor Cyan

# 1. Build the Docker Image
Write-Host "Step 1: Building image 'pavesadmin/intranet-fe'..." -ForegroundColor Yellow
docker build -t pavesadmin/intranet-fe:latest .
Check-ExitCode

# 2. Push to Docker Hub
Write-Host "Step 2: Pushing image to Docker Hub..." -ForegroundColor Yellow
docker push pavesadmin/intranet-fe:latest
Check-ExitCode

Write-Host "--- Deployment Successful! ---" -ForegroundColor Green