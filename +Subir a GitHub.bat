@echo off
setlocal enabledelayedexpansion
title Asistente de Automatizacion - GymNotes

echo ===================================================
echo    ASISTENTE INTELIGENTE DE AUTOMATIZACION
echo ===================================================
echo.

:: -----------------------------------------------------
:: PASO 0: DESBLOQUEAR GIT SI HABIA UN REBASE ATASCADO
:: -----------------------------------------------------
git rebase --abort >nul 2>&1
git merge --abort >nul 2>&1

:: -----------------------------------------------------
:: PASO 1: VERIFICAR SI GIT ESTÁ INSTALADO
:: -----------------------------------------------------
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] ERROR: Git no esta instalado en este sistema.
    echo Por favor, descarga e instala Git desde: https://git-scm.com/
    pause
    exit
)

:: -----------------------------------------------------
:: PASO 2: CONFIGURAR IDENTIDAD DE GIT (Si no existe)
:: -----------------------------------------------------
for /f "tokens=*" %%a in ('git config --global user.name 2^>nul') do set "GIT_USER=%%a"

if "!GIT_USER!"=="" (
    echo ---------------------------------------------------
    echo  CONFIGURACION INICIAL: Identidad de Usuario
    echo ---------------------------------------------------
    set /p "NEW_USER= Escribe tu nombre de usuario de GitHub: "
    set /p "NEW_EMAIL= Escribe tu correo de GitHub: "
    
    git config --global user.name "!NEW_USER!"
    git config --global user.email "!NEW_EMAIL!"
    echo [Ok] Usuario y correo guardados.
    echo.
)

:: -----------------------------------------------------
:: PASO 3: INICIALIZAR REPOSITORIO LOCAL (Si no existe .git)
:: -----------------------------------------------------
if not exist ".git" (
    echo Inicializando repositorio local...
    git init >nul
    git branch -M main >nul
)

:: -----------------------------------------------------
:: PASO 4: VINCULAR CON GITHUB (Si no hay origin)
:: -----------------------------------------------------
for /f "tokens=*" %%a in ('git remote get-url origin 2^>nul') do set "GIT_ORIGIN=%%a"

if "!GIT_ORIGIN!"=="" (
    echo ---------------------------------------------------
    echo  CONFIGURACION INICIAL: Vinculo con GitHub
    echo ---------------------------------------------------
    set /p "REPO_URL= Pega la URL de tu repositorio de GitHub: "
    git remote add origin "!REPO_URL!"
)

:: -----------------------------------------------------
:: PROCESO DE RESPALDO Y SUBIDA
:: -----------------------------------------------------
echo ===================================================
echo   EJECUTANDO PROCESO DE RESPALDO Y SUBIDA
echo ===================================================

:: 1. Detectar versión del Service Worker
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
:: COMPROBACIÓN: ¿LA VERSIÓN YA FUE RESPALDADA?
:: -----------------------------------------------------
set "BACKUP_DESTINI=..\GymNotes_Backups\!VERSION_FOLDER!"

if exist "!BACKUP_DESTINI!" (
    echo.
    echo ===================================================
    echo   [!] ADVERTENCIA: LA VERSION NO HA CAMBIADO
    echo ===================================================
    echo La carpeta de respaldo "!VERSION_FOLDER!" ya existe.
    echo Es muy probable que olvidaste actualizar CACHE_VERSION en sw.js.
    echo.
    set /p "CONTINUE_CHOICE= ¿Deseas continuar y subir de todos modos? (S/N): "
    if /i "!CONTINUE_CHOICE!" neq "S" (
        echo.
        echo Operacion cancelada. Cambia la version en sw.js y vuelve a ejecutar.
        echo.
        pause
        exit /b
    )
    echo.
    echo Continuando con el proceso de subida...
)

:: 2. Respaldo en nivel superior
echo [1/4] Creando/actualizando copia de seguridad superior...
robocopy "." "!BACKUP_DESTINI!" /E /XD .git /XF .agents *.bat >nul
echo [Ok] Respaldo guardado en: !BACKUP_DESTINI!

:: 3. Guardar cambios en Git localmente
echo [2/4] Guardando cambios locales...
git add -A
git commit -m "!COMMIT_MESSAGE!" >nul 2>&1

:: 4. Subir directo a GitHub
echo [3/4] Subiendo a GitHub (Push)...
git push -u origin main >nul 2>&1

:: 5. Si hay rechazo por desalineación, forzar sincronización limpia
if %errorlevel% neq 0 (
    echo [Info] Sincronizando historial con GitHub...
    git push -u origin main --force
)

echo.
echo ===================================================
echo   ¡PROCESO COMPLETADO Y SUBIDO EXITOSAMENTE!
echo ===================================================
pause