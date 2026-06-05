@echo off
echo ===================================
echo  SMEPRO360 Mobile App - Expo Start
echo ===================================
echo.
echo Starting Expo Metro Bundler on port 8082...
echo.
echo When QR code appears:
echo   - Android: Open Expo Go app, scan QR code
echo   - iOS:     Open Camera app, scan QR code
echo.
echo Press CTRL+C to stop.
echo.
cd /d "%~dp0"
npx expo start --port 8082
pause
