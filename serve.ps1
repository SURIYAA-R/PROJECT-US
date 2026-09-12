# serve.ps1 — Helper script to start the "Our Space" Node.js backend

# Add Node.js installation directory to PATH for this PowerShell session if missing
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:PATH += ";C:\Program Files\nodejs"
}

Write-Host "🌿 Starting Our Space Backend Server..." -ForegroundColor Green
node --env-file=.env server.js

