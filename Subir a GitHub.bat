@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo   INICIANDO AUTOMATIZACION DE GYMNOTES...
echo ===================================================

:: 1. Sincronizar con GitHub para prevenir bloqueos de subida
echo [1/4] Sincronizando con la nube...
git pull origin main --allow-unrelated-histories

:: 2. Añadir absolutamente todos los archivos (nuevos, modificados, carpetas)
echo [2/4] Escaneando todos los archivos de GymNotes...
git add -A

:: 3. DETECTAR TU CACHE_VERSION DESDE SW.JS (Filtrando solo la asignación)
set "DETECTED_VERSION="

if exist sw.js (
    :: Busca la línea que tenga CACHE_VERSION y un signo = para evitar los console.log
    for /f "tokens=2 delims='" %%a in ('findstr "CACHE_VERSION.*=" sw.js 2^>nul') do (
        set "DETECTED_VERSION=%%a"
    )
)

:: Si por algun motivo no encuentra la linea, usa un respaldo
if "!DETECTED_VERSION!"=="" (
    set "COMMIT_MESSAGE=Auto-Update - Cambios Generales"
) else (
    set "COMMIT_MESSAGE=Version SW: !DETECTED_VERSION!"
)

echo [Info] Identificador encontrado -> !COMMIT_MESSAGE!

:: 4. Hacer commit y subir todo a GitHub
echo [3/4] Guardando cambios en Git...
git commit -m "!COMMIT_MESSAGE!"

echo [4/4] Subiendo archivos a GitHub...
git push origin main

echo ===================================================
echo   ¡PROCESO COMPLETADO EXITOSAMENTE!
echo ===================================================
pause