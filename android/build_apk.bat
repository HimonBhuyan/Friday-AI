@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   STARK INDUSTRIES - F.R.I.D.A.Y. ANDROID BUILD CORE
echo ========================================================
echo.

cd /d "%~dp0"

:: Check if Gradle wrapper exists, if not download it
if not exist "gradle\wrapper\gradle-wrapper.jar" (
    echo [*] Initializing Gradle Wrapper...
    mkdir "gradle\wrapper" 2>nul
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/gradle/gradle/v8.4.0/gradle/wrapper/gradle-wrapper.jar' -OutFile 'gradle\wrapper\gradle-wrapper.jar'"
)

if not exist "gradle\wrapper\gradle-wrapper.properties" (
    (
        echo distributionBase=GRADLE_USER_HOME
        echo distributionPath=wrapper/dists
        echo distributionUrl=https\://services.gradle.org/distributions/gradle-8.4-bin.zip
        echo zipStoreBase=GRADLE_USER_HOME
        echo zipStorePath=wrapper/dists
    ) > "gradle\wrapper\gradle-wrapper.properties"
)

if not exist "gradlew.bat" (
    echo [*] Fetching gradlew batch runner...
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/gradle/gradle/v8.4.0/gradlew.bat' -OutFile 'gradlew.bat'"
)

echo [*] Compiling F.R.I.D.A.Y. Android APK...
call gradlew.bat assembleDebug

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] F.R.I.D.A.Y. APK COMPILED SUCCESSFULLY!
    echo ========================================================
    echo   APK Location: app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo   To deploy to your phone via USB or Wi-Fi, run:
    echo   adb install -r app\build\outputs\apk\debug\app-debug.apk
    echo ========================================================
) else (
    echo.
    echo [!] Build encountered an error. You can also open the 'android' folder directly in Android Studio.
)

pause
