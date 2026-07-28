$base = "F:\Coding\ths-thm-new\ths-thm-system\apps\web\app(dashboard)"

function Get-DashboardFiles {
    $dirs = Get-ChildItem -Path $base -Directory
    $files = @()
    foreach ($d in $dirs) {
        $sub = Get-ChildItem -Path $d.FullName -Filter "*.tsx" -Recurse -ErrorAction SilentlyContinue
        foreach ($f in $sub) {
            $files += $f
        }
    }
    return $files
}

function Write-Match($file, $line, $text) {
    if ($text.Length -gt 110) { $text = $text.Substring(0, 110) + "..." }
    Write-Host "$file`:${line} $text"
}

$files = Get-DashboardFiles
Write-Host "=== Total .tsx files found: $($files.Count) ==="
Write-Host ""

# 1. .data.data patterns
Write-Host "=== Pattern 1: .data.data (should be correct) ==="
foreach ($f in $files) {
    $m = Select-String -Path $f.FullName -Pattern "\.data\.data" -SimpleMatch
    foreach ($x in $m) {
        Write-Match $f.Name $x.LineNumber $x.Line.Trim()
    }
}

# 2. .data?.data patterns  
Write-Host "`n=== Pattern 2: .data?.data (also correct) ==="
foreach ($f in $files) {
    $m = Select-String -Path $f.FullName -Pattern "\.data\?\.data" -SimpleMatch
    foreach ($x in $m) {
        Write-Match $f.Name $x.LineNumber $x.Line.Trim()
    }
}

# 3. setState from apiClient without .data access
Write-Host "`n=== Pattern 3: apiClient call + setState (may skip .data) ==="
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match "apiClient\.(get|post|put)") {
            # Look 1-3 lines ahead for setState
            for ($j = 1; $j -le 4; $j++) {
                if ($i + $j -lt $lines.Count) {
                    $next = $lines[$i + $j].Trim()
                    if ($next -match "set[A-Z]") {
                        Write-Match $f.Name ($i+1) "$($line.Trim()) -> $next"
                        break
                    }
                    if ($next -match "^\);" -or $next -match "^\}\);") {
                        break
                    }
                }
            }
        }
    }
}
