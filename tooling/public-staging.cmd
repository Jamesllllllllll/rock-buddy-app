@echo off
setlocal
set "ROCK_BUDDY_TEST_EXE=%LOCALAPPDATA%\Programs\rock-buddy\rock-buddy.exe"
if not "%~1"=="" set "ROCK_BUDDY_TEST_EXE=%~1"
if not exist "%ROCK_BUDDY_TEST_EXE%" (
  echo Could not find the public Rock Buddy installation.
  echo Drag its rock-buddy.exe onto this script to select a custom installation.
  pause
  exit /b 1
)
set "ELECTRON_RUN_AS_NODE=1"
"%ROCK_BUDDY_TEST_EXE%" "%~dp0public-staging.cjs"
if errorlevel 1 pause
endlocal
