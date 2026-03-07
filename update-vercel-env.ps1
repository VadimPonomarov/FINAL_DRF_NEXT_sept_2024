#!/usr/bin/env pwsh
# Run this after: vercel login
# Usage: .\update-vercel-env.ps1

$env_pairs = @(
  @("BACKEND_URL",                    "https://autoria-web-production.up.railway.app"),
  @("NEXT_PUBLIC_BACKEND_URL",        "https://autoria-web-production.up.railway.app"),
  @("NEXT_PUBLIC_FLOWER_URL",         "https://autoria-flower-production.up.railway.app"),
  @("NEXT_PUBLIC_REDIS_INSIGHT_URL",  "https://autoria-redis-insight-production.up.railway.app"),
  @("NEXT_PUBLIC_RABBITMQ_URL",       "https://autoria-rabbitmq-production.up.railway.app"),
  @("NEXTAUTH_URL",                   "https://autoria-clone.vercel.app")
)

foreach ($pair in $env_pairs) {
  $name  = $pair[0]
  $value = $pair[1]
  Write-Host "Setting $name = $value"
  # Remove existing (ignore error if not found)
  vercel env rm $name production --yes 2>$null
  # Add new value
  $value | vercel env add $name production
}

Write-Host "`nAll env vars updated. Deploying to production..."
vercel --prod
