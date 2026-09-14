param(
    [int]$Port = 8420,
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root on http://localhost:$Port/"

$mime = @{
    ".html" = "text/html"; ".htm" = "text/html"; ".js" = "application/javascript";
    ".css" = "text/css"; ".json" = "application/json"; ".png" = "image/png";
    ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".gif" = "image/gif";
    ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    try {
        $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
        if ($path -eq "/") { $path = "/index.html" }
        $fullPath = Join-Path $Root ($path.TrimStart("/"))
        $fullPath = [System.IO.Path]::GetFullPath($fullPath)
        if (-not $fullPath.StartsWith([System.IO.Path]::GetFullPath($Root))) {
            $res.StatusCode = 403
            $res.Close()
            continue
        }
        if (Test-Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $ct = $mime[$ext]
            if (-not $ct) { $ct = "application/octet-stream" }
            $res.ContentType = $ct
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $buf = [System.Text.Encoding]::UTF8.GetBytes("Not found")
            $res.OutputStream.Write($buf, 0, $buf.Length)
        }
    } catch {
        try { $res.StatusCode = 500 } catch {}
    } finally {
        $res.Close()
    }
}
