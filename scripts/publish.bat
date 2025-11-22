@echo off
REM Batch script to publish Electron app to GitHub Releases
REM Usage: scripts\publish.bat YOUR_TOKEN_HERE

if "%1"=="" (
    echo Error: GitHub token required
    echo Usage: scripts\publish.bat YOUR_TOKEN_HERE
    exit /b 1
)

echo Setting up GitHub token...
set GH_TOKEN=%1

echo Building and publishing to GitHub Releases...
call pnpm run electron:publish

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Successfully published to GitHub Releases!
) else (
    echo.
    echo Publishing failed. Check the error messages above.
)

