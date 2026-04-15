@echo off
title Advanced Portable Database System
color 0b

:: 1. Add the portable Node.js folder to the temporary system PATH
:: This allows Windows to find node.exe locally without global installation
set PATH=%~dp0node_portable;%PATH%

:: 2. Check if the portable Node.js folder exists and is named correctly
if not exist "%~dp0node_portable\node.exe" (
    color 0c
    echo ===================================================
    echo ERROR: Node.js Portable Not Found!
    echo ===================================================
    echo Please ensure you have downloaded Node.js portable,
    echo renamed its folder to "node_portable",
    echo and placed it in the exact same directory as this file.
    echo.
    pause
    exit
)

:: 3. Automatically install required packages (express) on the first run
if not exist "%~dp0node_modules\express" (
    color 0e
    echo ===================================================
    echo Initializing system for the first time...
    echo Please wait while required modules are installed...
    echo ===================================================
    call npm install express
    echo.
    echo Setup completed successfully!
    color 0b
    timeout /t 2 >nul
    cls
)

:: 4. Start the Application
echo ===================================================
echo     Starting Portable Client-Server Database...
echo ===================================================
echo.
echo [System]  Portable Node.js detected successfully.
echo [Server]  Starting local backend on http://localhost:3000
echo [Browser] Opening default web browser...
echo.
echo NOTE: Keep this command window open to keep the server running.
echo       To stop the database, simply close this window.
echo ---------------------------------------------------

:: Open the default web browser to the app URL
start http://localhost:3000

:: Run the server using the portable Node.js
node server.js

:: Pause to keep the window open if the server crashes or stops
pause