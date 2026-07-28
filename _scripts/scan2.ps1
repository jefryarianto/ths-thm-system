$base = "F:\Coding\ths-thm-new\ths-thm-system\apps\web\app"
$dashDir = Join-Path $base "\(dashboard\)"

# Use literal path with backtick escaping for PowerShell
$dirs = Get-ChildItem -LiteralPath "$base\(dashboard\)" -Directory

Write-Host "=== Directories found: $($dirs.Count) ==="
foreach ($d in $dirs) {
    Write-Host "  $($d.Name)"
}

$files = @()
foreach ($d in $dirs) {
    $sub = Get-ChildItem -LiteralPath $d.FullName -Filter "*.tsx" -Recurse -ErrorAction SilentlyContinue
    foreach ($f in $sub) {
        $files += $f
    }
}

Write-Host "`n=== Total .tsx files found: $($files.Count) ==="
Write-Host ""

# 1. .data.data patterns
Write-Host "=== .data.data patterns ==="
$count1 = 0
foreach ($f in $files) {
    $m = Select-String -LiteralPath $f.FullName -Pattern "\.data\.data" -SimpleMatch
    foreach ($x in $m) {
        $count1++
        $trimmed = $x.Line.Trim()
        if ($trimmed.Length -gt 120) { $trimmed = $trimmed.Substring(0, 120) + "..." }
        Write-Host "$($f.Name):$($x.LineNumber) $trimmed"
    }
}
Write-Host "  Total: $count1"

# 2. data?.data patterns
Write-Host "`n=== data?.data patterns ==="
$count2 = 0
foreach ($f in $files) {
    $m = Select-String -LiteralPath $f.FullName -Pattern "data\?\.data" -SimpleMatch
    foreach ($x in $m) {
        $count2++
        $trimmed = $x.Line.Trim()
        if ($trimmed.Length -gt 120) { $trimmed = $trimmed.Substring(0, 120) + "..." }
        Write-Host "$($f.Name):$($x.LineNumber) $trimmed"
    }
}
Write-Host "  Total: $count2"

# 3. Raw response data (res.data.X, result.data.X)  where X is NOT 'data'
Write-Host "`n=== res.data / result.data (direct property access, not .data.data) ==="
$count3 = 0
foreach ($f in $files) {
    $lines = Get-Content -LiteralPath $f.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match "res\.data\.(?!data)" -or $line -match "result\.data\.(?!data)") {
            $count3++
            $trimmed = $line.Trim()
            if ($trimmed.Length -gt 120) { $trimmed = $trimmed.Substring(0, 120) + "..." }
            Write-Host "$($f.Name):$($i+1) $trimmed"
        }
    }
}
Write-Host "  Total: $count3"

# 4. useApi calls - check data access
Write-Host "`n=== useApi + data.X usage (may skip .data nesting) ==="
$count4 = 0
foreach ($f in $files) {
    $content = Get-Content -LiteralPath $f.FullName -Raw
    if ($content -match "useApi") {
        # Check if the component accesses data.data or just data
        $lines = $content -split "`n"
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "useApi\(") {
                # Look for how the data is used in the next 30 lines
                $usesDataData = $false
                $usesBareData = $false
                for ($j = 1; $j -le 30 -and ($i + $j) -lt $lines.Count; $j++) {
                    if ($lines[$i+$j] -match "\.data\.") { $usesDataData = $true }
                    if ($lines[$i+$j] -match "data\." -and $lines[$i+$j] -notmatch "\.data\.") { $usesBareData = $true }
                }
                if (-not $usesDataData -and $usesBareData) {
                    $count4++
                    Write-Host "$($f.Name):$($i+1) POTENTIAL ISSUE: useApi data used without .data nesting"
                }
            }
        }
    }
}
Write-Host "  Total potential issues: $count4"
