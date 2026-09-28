$pkgStr = Get-Content package.json -Raw
$pkg = $pkgStr | ConvertFrom-Json
$v = $pkg.version.Split('.')
$v[2] = [int]$v[2] + 1
$pkg.version = $v -join '.'
$newPkg = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText("$pwd\package.json", $newPkg, (New-Object System.Text.UTF8Encoding $False))
if (Test-Path src) {
    [System.IO.File]::WriteAllText("$pwd\src\version.ts", "export const APP_VERSION = '$($pkg.version)';", (New-Object System.Text.UTF8Encoding $False))
}
Write-Host "Version bumped to $($pkg.version)"