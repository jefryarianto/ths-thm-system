# Scan all dashboard pages for API data access patterns after TransformInterceptor wrapping
$base = "F:\Coding\ths-thm-new\ths-thm-system\apps\web\app(dashboard)"

Write-Host "=== Scanning for .data.data patterns (likely correct after interceptor) ==="
$files = Get-ChildItem -Recurse -Filter "*.tsx" $base
foreach ($f in $files) {
    $matches = Select-String -Path $f.FullName -Pattern "\.data\.data" -SimpleMatch
    foreach ($m in $matches) {
        Write-Host "$($f.Name):$($m.LineNumber) $($m.Line.Trim())"
    }
}

Write-Host "`n=== Scanning for { data } destructuring (may need .data access) ==="
foreach ($f in $files) {
    $matches = Select-String -Path $f.FullName -Pattern 'useApi\(' -SimpleMatch
    foreach ($m in $matches) {
        Write-Host "$($f.Name):$($m.LineNumber) $($m.Line.Trim())"
    }
}

Write-Host "`n=== Scanning for direct res.data access (not .data.data) ==="
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        # Look for patterns like: data.something or res.data.something (NOT .data.data)
        if ($line -match 'res\.data\.(?!data)[a-zA-Z]' -or $line -match 'result\.data\.(?!data)[a-zA-Z]') {
            Write-Host "$($f.Name):$($i+1) $($line.Trim())"
        }
    }
}

Write-Host "`n=== Scanning for apiClient calls to check response handling ==="
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match 'apiClient\.(get|post|put|patch|delete)\(' -or $line -match 'useApi\(') {
            # Check next few lines for how the response is handled
            $sig = "$($line.Trim())"
            for ($j = 1; $j -le 3; $j++) {
                if ($i + $j -lt $lines.Count) {
                    $next = $lines[$i + $j].Trim()
                    if ($next -match '\.then\(|set[A-Z]|data\.' -or $next -eq '') {
                        if ($next -ne '') {
                            $sig = "$sig | $next"
                            break
                        }
                    } else {
                        $sig = "$sig | $next"
                        break
                    }
                }
            }
            Write-Host "$($f.Name):$($i+1) $sig"
        }
    }
}

Write-Host "`n=== Scanning for known-old patterns: success, data in object destructure ==="
foreach ($f in $files) {
    $m = Select-String -Path $f.FullName -Pattern "success.*data|data.*success" -SimpleMatch
    foreach ($match in $m) {
        $trimmed = $match.Line.Trim()
        if ($trimmed.Length -gt 120) { $trimmed = $trimmed.Substring(0, 120) + "..." }
        Write-Host "$($f.Name):$($match.LineNumber) $trimmed"
    }
}
