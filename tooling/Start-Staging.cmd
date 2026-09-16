@echo off
setlocal
cd /d "%~dp0"
start "" "%~dp0rock-buddy.exe" staging https://rock-buddy-site-staging.rock-buddy.workers.dev
