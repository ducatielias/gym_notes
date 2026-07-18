@echo off
echo Empezando la automatizacion...

:: 1. Añade todos los cambios al escenario de Git
git add .

:: 2. Hace el commit con un mensaje automático
git commit -m "Auto-update: Cambios guardados automaticamente"

:: 3. Sube los cambios a GitHub (asegúrate de que tu rama se llama main o master)
git push origin main

echo ¡Todo listo y subido a GitHub!
pause