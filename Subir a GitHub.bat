@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo   INICIANDO AUTOMATIZACION DE GYMNOTES...
echo ===================================================

:: 1. Sincronizar con GitHub por si hay cambios en la nube
echo Actualizando repositorio...
git pull origin main --allow-unrelated-histories

:: 2. Añadir ABSOLUTAMENTE TODOS los archivos de la carpeta
echo Escaneando archivos nuevos y modificados...
git add -A

:: 3. DETECTAR LA CACHÉ AUTOMÁTICAMENTE
set "CACHE_VERSION=Cambios Generales"

:: Busca en sw.js cualquier linea que tenga la version (ej: v1, v2, gym-v1)
if exist sw.js (
    for /f "tokens=2 delims==" %%a in ('findstr /I "CACHE_NAME cache version v" sw.js 2^>nul') do (
        set "CACHE_VERSION=Cache: %%a"
    )
)

:: Limpiar comillas, espacios o puntos y comas del texto encontrado
set "CACHE_VERSION=%CACHE_VERSION:"=%"
set "CACHE_VERSION=%CACHE_VERSION:;=%"
set "CACHE_VERSION=%CACHE_VERSION:'=%"

echo [Info] Identificador detectado: %CACHE_VERSION%

:: 4. Hacer el commit con el nombre de la caché
echo Guardando cambios en Git...
git commit -m "Auto-Update - %CACHE_VERSION%"

:: 5. Subir todo a GitHub
echo Subiendo archivos a GitHub...
git push origin main

echo ===================================================
echo   ¡PROCESO COMPLETADO EXITOSAMENTE!
echo ===================================================
pause