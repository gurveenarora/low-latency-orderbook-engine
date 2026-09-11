@echo off
echo Initializing MSVC Environment...
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"

echo Building High-Performance C++20 Matching Engine DLL...
cl.exe /O2 /std:c++20 /EHsc /LD c_api.cpp /Fe:matching_engine.dll

if exist matching_engine.dll (
    echo BUILD SUCCESS: matching_engine.dll generated successfully!
) else (
    echo BUILD FAILED!
)
