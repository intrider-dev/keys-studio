$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/api/status' -TimeoutSec 2
} catch {
    $pythonExecutable = (Get-Command pythonw.exe).Source
    Start-Process -FilePath $pythonExecutable -ArgumentList ('"' + (Join-Path $projectDirectory 'server.py') + '"') -WorkingDirectory $projectDirectory -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Start-Process 'http://127.0.0.1:8765'
