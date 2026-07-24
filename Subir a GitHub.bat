@echo off
setlocal enabledelayedexpansion
title Asistente de Automatizacion - GymNotes

echo ===================================================
echo    ASISTENTE INTELIGENTE DE AUTOMATIZACION
echo ===================================================
echo.

:: -----------------------------------------------------
:: PASO 1: VERIFICAR SI GIT ESTÁ INSTALADO
:: -----------------------------------------------------
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] ERROR: Git no esta instalado en este sistema.
    echo.
    echo Por favor, descarga e instala Git desde: https://git-scm.com/
    echo Asegurate de seleccionar la opcion "Git from the command line".
    echo.
    pause
    exit
)

:: -----------------------------------------------------
:: PASO 2: CONFIGURAR IDENTIDAD DE GIT (Si no existe)
:: -----------------------------------------------------
for /f "tokens=*" %%a in ('git config --global user.name 2^>nul') do set "GIT_USER=%%a"
for /f "tokens=*" %%a in ('git config --global user.email 2^>nul') do set "GIT_EMAIL=%%a"

if "!GIT_USER!"=="" (
    echo ---------------------------------------------------
    echo  CONFIGURACION INICIAL: Identidad de Usuario
    echo ---------------------------------------------------
    echo Parece que es la primera vez que usas Git en esta PC.
    echo.
    set /p "NEW_USER= Escribe tu nombre de usuario de GitHub: "
    set /p "NEW_EMAIL= Escribe tu correo de GitHub: "
    
    git config --global user.name "!NEW_USER!"
    git config --global user.email "!NEW_EMAIL!"
    echo [Ok] Usuario y correo guardados correctamente.
    echo.
)

:: -----------------------------------------------------
:: PASO 3: INICIALIZAR REPOSITORIO LOCAL (Si no existe .git)
:: -----------------------------------------------------
if not exist ".git" (
    echo ---------------------------------------------------
    echo  CONFIGURACION INICIAL: Repositorio Git
    echo ---------------------------------------------------
    echo Inicializando repositorio local...
    git init >nul
    git branch -M main >nul
    echo [Ok] Repositorio Git local creado.
    echo.
)

:: -----------------------------------------------------
:: PASO 4: VINCULAR CON GITHUB (Si no hay origin)
:: -----------------------------------------------------
for /f "tokens=*" %%a in ('git remote get-url origin 2^>nul') do set "GIT_ORIGIN=%%a"

if "!GIT_ORIGIN!"=="" (
    echo ---------------------------------------------------
    echo  CONFIGURACION INICIAL: Vinculo con GitHub
    echo ---------------------------------------------------
    echo No se encontro un repositorio remoto vinculado.
    echo.
    echo Ve a GitHub, crea tu repositorio y copia el enlace HTTPS.
    echo Ejemplo: https://github.com/tu-usuario/tu-repositorio.git
    echo.
    set /p "REPO_URL= Pega la URL de tu repositorio de GitHub: "
    
    git remote add origin "!REPO_URL!"
    echo [Ok] Enlace remoto guardado con exito.
    echo.
)

:: -----------------------------------------------------
:: PROCESO HABITUAL (BACKUP Y AUTOMATIZACIÓN)
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

:: 2. Respaldo un nivel arriba
echo [1/4] Creando copia de seguridad superior...
set "BACKUP_DESTINI=..\GymNotes_Backups\!VERSION_FOLDER!"
robocopy "." "!BACKUP_DESTINI!" /E /XD .git /XF .agents *.bat >nul
echo [Ok] Respaldo guardado en: !BACKUP_DESTINI!

:: 3. Subida a GitHub
echo [2/4] Sincronizando con la nube...
git pull origin main --allow-unrelated-histories >nul 2>&1

echo [3/4] Guardando cambios locales...
git add -A
git commit -m "!COMMIT_MESSAGE!" >nul 2>&1

echo [4/4] Subiendo a GitHub...
git push origin main

echo ===================================================
echo   ¡PROCESO COMPLETADO EXITOSAMENTE!
echo ===================================================
pause