param([ValidateSet('start','stop','status','logs','pull')][string]$Action = 'start')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$secretPath = Join-Path $PSScriptRoot '.secret_key'
if (-not (Test-Path -LiteralPath $secretPath)) {
    $secretBytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($secretBytes)
    $rng.Dispose()
    [System.IO.File]::WriteAllText($secretPath, [Convert]::ToBase64String($secretBytes))
}
$env:WO_SECRET_KEY = [System.IO.File]::ReadAllText($secretPath).Trim()
$composeArgs = @('compose','-p','drone-webodm','-f','docker-compose.yml','-f','docker-compose.nodeodm.yml','-f','docker-compose.local.yml')
switch ($Action) {
    'start' { & docker @composeArgs up -d }
    'stop' { & docker @composeArgs stop }
    'status' { & docker @composeArgs ps }
    'logs' { & docker @composeArgs logs --tail 60 }
    'pull' { & docker @composeArgs pull }
}
exit $LASTEXITCODE
