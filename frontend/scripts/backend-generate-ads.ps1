param(
  [int]$Count = 10,
  [string]$Backend = $env:NEXT_PUBLIC_BACKEND_URL
)

$ErrorActionPreference = 'Stop'



function Login-Backend {
  param(
    [string]$BackendUrl,
    [string]$Email,
    [string]$Password
  )
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
  $resp = Invoke-RestMethod -Method Post -Uri "$BackendUrl/api/auth/login" -ContentType 'application/json' -Body $body
  if ($resp.access) { return $resp.access }
  if ($resp.token) { return $resp.token }
  throw 'No access token in login response'
}

function Get-Marks {
  param(
    [string]$BackendUrl,
    [hashtable]$Headers
  )
  $resp = Invoke-RestMethod -Method Get -Uri "$BackendUrl/api/ads/reference/marks/?page_size=200" -Headers $Headers
  if ($resp.results) { return $resp.results }
  if ($resp.options) { return $resp.options }
  return @()
}

function New-RandomAdPayload {
  param(
    [pscustomobject]$Mark
  )
  $year = Get-Random -Minimum 2015 -Maximum 2025
  $mileage = Get-Random -Minimum 0 -Maximum 200000
  $condition = if ($mileage -lt 5000) { 'new' } else { 'used' }
  $price = Get-Random -Minimum 5000 -Maximum 80000
  $vt = if ($Mark.PSObject.Properties.Name -contains 'vehicle_type' -and $Mark.vehicle_type) { [int]$Mark.vehicle_type } else { 1 }
  $vtname = if ($Mark.PSObject.Properties.Name -contains 'vehicle_type_name' -and $Mark.vehicle_type_name) { [string]$Mark.vehicle_type_name } else { 'car' }
  $title = "${($Mark.name)} ${year} - Test Ad"

  $payload = @{
    title = $title
    description = "Автотест объявление"
    vehicle_type = $vt
    vehicle_type_name = $vtname
    mark = [int]$Mark.id
    make = [int]$Mark.id
    model = "Model"
    year = [int]$year
    mileage_km = [int]$mileage
    condition = $condition
    price = [int]$price
    currency = 'UAH'
    region = 203
    city = 1142
    use_profile_contacts = $true
    status = 'active'
  }
  return ($payload | ConvertTo-Json -Compress)
}


if (-not $Backend -or $Backend -eq '') { $Backend = 'http://localhost:8000' }
Write-Host "Backend: $Backend"

# 1) Login
$token = Login-Backend -BackendUrl $Backend -Email 'pvs.versia@gmail.com' -Password '12345678'
$headers = @{ 'Authorization' = "Bearer $token"; 'Content-Type' = 'application/json' }

# 2) Get marks
$marks = Get-Marks -BackendUrl $Backend -Headers $headers
if ($marks.Count -eq 0) { throw 'No marks available from backend' }

# 3) Create ads
$created = 0
for ($i = 1; $i -le $Count; $i++) {
  $mark = $marks[ (Get-Random -Minimum 0 -Maximum $marks.Count) ]
  $payload = New-RandomAdPayload -Mark $mark
  try {
    $resp = Invoke-RestMethod -Method Post -Uri "$Backend/api/ads/cars/create" -Headers $headers -Body $payload
    if ($resp) { $created++ ; Write-Host "Created ad $i (mark=$($mark.name))" }
  } catch {
    $errBody = ''
    try {
      $resp = $_.Exception.Response
      if ($resp) {
        $stream = $resp.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $errBody = $reader.ReadToEnd()
          $reader.Dispose()
          $stream.Dispose()
        }
      }
    } catch {}
    Write-Warning ("Failed to create ad {0}: {1} | Body: {2}" -f $i, $_.Exception.Message, $errBody)
  }
}

Write-Output (ConvertTo-Json @{ success = $true; created = $created } -Compress)

