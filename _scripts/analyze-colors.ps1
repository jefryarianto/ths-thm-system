Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile('C:\coding\ths-thm-system\_scripts\reference-card.jpg')
$w = $img.Width
$h = $img.Height

# ASCII map of green regions at ~30x30 resolution
$cols = 40
$rows = 30
Write-Host "--- Green/White ASCII Map ($cols x $rows) ---"
for ($r = 0; $r -lt $rows; $r++) {
    $line = ''
    for ($c = 0; $c -lt $cols; $c++) {
        $x = [int](($c + 0.5) * $w / $cols)
        $y = [int](($r + 0.5) * $h / $rows)
        $pix = $img.GetPixel($x, $y)
        # Measure green dominance
        $isGreen = ($pix.G -gt 40) -and ($pix.G -gt ($pix.R + 20)) -and ($pix.G -gt ($pix.B + 20))
        $isDarkGreen = $isGreen -and ($pix.G -lt 160)
        $isLightGreen = $isGreen -and ($pix.G -ge 160)
        if ($isDarkGreen) { $line += 'D' }
        elseif ($isLightGreen) { $line += 'l' }
        elseif ($pix.R -lt 200 -and $pix.G -lt 200 -and $pix.B -lt 200) { $line += '.' }  # gray/dark
        else { $line += ' ' }  # white
    }
    Write-Host $line
}

Write-Host ""
Write-Host "Legend: D=dark green, l=light green, .=gray/dark, (space)=white"
Write-Host ""

# Sample exact green color values
Write-Host "--- Green color samples ---"
$sampled = @()
for ($x = 0; $x -lt $w; $x += 3) {
    for ($y = 0; $y -lt $h; $y += 3) {
        $pix = $img.GetPixel($x, $y)
        $isGreen = ($pix.G -gt 40) -and ($pix.G -gt ($pix.R + 20)) -and ($pix.G -gt ($pix.B + 20))
        if ($isGreen) {
            $key = "$($pix.R),$($pix.G),$($pix.B)"
            if (-not $sampled.Contains($key)) {
                $sampled += $key
            }
        }
    }
}
# Show unique green shades (up to 15)
$sampled | Select-Object -First 15 | ForEach-Object { Write-Host ("RGB(" + $_ + ")") }

$img.Dispose()