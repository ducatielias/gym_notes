@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo   INICIANDO AUTOMATIZACION Y BACKUP SUPERIOR...
echo ===================================================

:: 1. DETECTAR TU CACHE_VERSION DESDE SW.JS
set "DETECTED_VERSION="
if exist sw.js (
    for /f "tokens=2 delims='" %%a in ('findstr "CACHE_VERSION.*=" sw.js 2^>nul') do (
        set "DETECTED_VERSION=%%a"
    )
)

if "!DETECTED_VERSION!"=="" (
    set "VERSION_FOLDER=v_desconocida"
    set "COMMIT_MESSAGE=Auto-Update - Cambios Generales"
) else (
    set "VERSION_FOLDER=!DETECTED_VERSION!"
    set "COMMIT_MESSAGE=Version SW: !DETECTED_VERSION!"
)

echo [Info] Version detectada: !VERSION_FOLDER!

:: -----------------------------------------------------
:: 2. CREAR COPIA DE SEGURIDAD UN NIVEL ARRIBA (..)
:: -----------------------------------------------------
echo [1/5] Creando copia de seguridad en nivel superior...

:: El ".." le dice a Windows que salga de la carpeta "Codex" y vaya a "GymNotes"
set "BACKUP_DESTINI=..\GymNotes_Backups\!VERSION_FOLDER!"

:: ROBOCOPY origen destino /E /XD(excluir carpetas) /XF(excluir archivos)
robocopy "." "!BACKUP_DESTINI!" /E /XD .git /XF .agents *.bat >nul

echo [Ok] Copia guardada en: !BACKUP_DESTINI!

:: -----------------------------------------------------
:: 3. PROCESO DE GIT Y GITHUB
:: -----------------------------------------------------
echo [2/5] Sincronizando con la nube...
git pull origin main --allow-unrelated-histories

echo [3/5] Escaneando archivos para GitHub...
git add -A

echo [4/5] Guardando cambios en Git...
git commit -m "!COMMIT_MESSAGE!"

echo [5/5] Subiendo archivos a GitHub...
git push origin main

echo ===================================================
echo   ¡RESPALDO ARRIBA Y SUBIDA COMPLETADOS!
echo ===================================================
pause