@echo off
echo Empezando la automatizacion...

:: 1. Trae lo que esté en GitHub y lo fusiona con tu carpeta local
:: Usamos --allow-unrelated-histories por si los proyectos nacieron separados
git pull origin main --allow-unrelated-histories

:: 2. Añade todos tus archivos locales (HTML, JS, CSS)
git add .

:: 3. Hace el commit con un mensaje automático
git commit -m "Auto-update: Cambios y cache actualizados"

:: 4. Sube todo limpio a GitHub
git push origin main

echo ¡Todo listo y subido a GitHub!
pause