# fe-deploy.ps1

# Stop the script if any command fails
$ErrorActionPreference = "Stop"

Write-Host "--- Starting Deployment for intranet-fe ---" -ForegroundColor Cyan

# 1. Build the Docker Image
Write-Host "Step 1: Building image 'pavesadmin/intranet-fe'..." -ForegroundColor Yellow
docker build -t pavesadmin/intranet-fe .

# 2. Push to Docker Hub
# Note: Ensure you have run 'docker login' once before running this
Write-Host "Step 2: Pushing image to Docker Hub..." -ForegroundColor Yellow
docker push pavesadmin/intranet-fe

Write-Host "--- Deployment Successful! ---" -ForegroundColor Green