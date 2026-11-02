@echo off
cd /d "%~dp0"
py -3 serve.py --port 8765
pause
