@echo off
setlocal
cd /d "%~dp0"
start "" "%~dp0rock-buddy.exe" staging https://rock-buddy-site-staging.tntmusicstudios-c64.workers.dev
