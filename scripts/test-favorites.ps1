$ErrorActionPreference = 'Stop'

function Assert-Ok($resp, $step) {
  if (-not $resp) { throw "Step '$step' returned no response" }
}

Write-Host "=== Login (backend) ==="
$loginBody = @{ email = 'pvs.versia@gmail.com'; password = '12345678' } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType 'application/json' -Body $loginBody
Assert-Ok $login 'login'
Write-Host "LoginOK"

$redis = Invoke-RestMethod -Uri http://localhost:3000/api/redis?key=backend_auth
Write-Host ("Redis exists=$($redis.exists)")

Write-Host "=== Fetch cars ==="
$cars = Invoke-RestMethod -Uri 'http://localhost:3000/api/autoria/cars?page=1&page_size=10&ordering=-created_at'
Assert-Ok $cars 'cars list'
if (-not $cars.results -or $cars.results.Count -eq 0) { throw 'No cars found' }
$id = $cars.results[0].id
Write-Host ("Picked ID=$id")

Write-Host "=== Ensure favorite = TRUE (idempotent) ==="
$before = Invoke-RestMethod -Uri ("http://localhost:3000/api/autoria/cars/" + $id)
$beforeFav = if ($null -eq $before.is_favorite) { $false } else { [bool]$before.is_favorite }
Write-Host ("Before is_favorite=$beforeFav")
if (-not $beforeFav) {
  $toggleBody = @{ car_ad_id = $id } | ConvertTo-Json -Compress
  $toggle = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/autoria/favorites/toggle -ContentType 'application/json' -Body $toggleBody
  Assert-Ok $toggle 'toggle add'
  Write-Host ("Toggled to=$($toggle.is_favorite)")
}

Start-Sleep -Milliseconds 700

Write-Host "=== Verify persisted on ad detail ==="
$after = Invoke-RestMethod -Uri ("http://localhost:3000/api/autoria/cars/" + $id)
$afterFav = if ($null -eq $after.is_favorite) { $false } else { [bool]$after.is_favorite }
Write-Host ("After is_favorite=$afterFav")

Write-Host "=== Verify favorites listing contains the ad ==="
$fav = Invoke-RestMethod -Uri 'http://localhost:3000/api/autoria/favorites?page=1&page_size=50'
$contains = $false
foreach ($r in $fav.results) { if ($r.id -eq $id) { $contains = $true } }
Write-Host ("FavoritesListContains=$contains")

if (-not $afterFav -or -not $contains) {
  throw 'Verification failed: state not consistent across endpoints'
}

Write-Host "=== SUCCESS: Click -> DB sync -> Refresh -> Favorites filter all OK ===" -ForegroundColor Green
