@echo off
cd /d "%~dp0"
set PYTHON="C:\Users\mvall\AppData\Local\Microsoft\WindowsApps\python3.13.exe"

REM Mata cualquier proceso previo de Flask/AppGastos.py para evitar servidores viejos y duplicados.
powershell -NoProfile -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'python' -and $_.CommandLine -match 'AppGastos.py' }; if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }"

REM Arranque limpio sin reloader para evitar procesos dobles.
start "GestionGastos" cmd /k "%PYTHON% AppGastos.py"

REM Espera a que Flask arranque y abre el frontend en el navegador.
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5000"
exit /b 0
