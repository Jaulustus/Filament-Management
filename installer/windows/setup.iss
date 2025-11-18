; Inno Setup Script for FilaHub
; Requires Inno Setup 6+

#define MyAppName "FilaHub"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "Jaulustus"
#define MyAppExeName "Start Programm.bat"
#define SourceDir "..\..\dist\windows\app"
#define LicenseFilePath "..\..\installer\windows\license.txt"
#define NodeInstallerX64 "dependencies\node-v24.11.1-x64.msi"
#define NodeInstallerARM64 "dependencies\node-v24.11.1-arm64.msi"

#ifexist {#NodeInstallerX64}
  #define WithNodeInstallerX64
#endif
#ifexist {#NodeInstallerARM64}
  #define WithNodeInstallerARM64
#endif
#ifdef WithNodeInstallerX64
  #define WithNodeInstaller
#endif
#ifdef WithNodeInstallerARM64
  #define WithNodeInstaller
#endif

[Setup]
AppId={{2A9C8777-1F1F-4C8A-8D05-6F8A2E8E3A0B}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\FilaHub
DisableProgramGroupPage=yes
OutputDir=..\dist\windows\installer
OutputBaseFilename=FilaHubSetup
Compression=lzma
SolidCompression=yes
SetupIconFile=..\..\assets\icons\app.ico
; Falls app.ico nicht existiert, wird ein Standard-Icon verwendet
WizardStyle=modern
#ifexist {#LicenseFilePath}
LicenseFile={#LicenseFilePath}
#endif

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion
#ifdef WithNodeInstallerX64
Source: "{#NodeInstallerX64}"; DestDir: "{tmp}"; Flags: deleteafterinstall
#endif
#ifdef WithNodeInstallerARM64
Source: "{#NodeInstallerARM64}"; DestDir: "{tmp}"; Flags: deleteafterinstall
#endif

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Run]
Filename: "{app}\Start Programm.bat"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
#ifdef WithNodeInstallerX64
Filename: "{tmp}\node-v24.11.1-x64.msi"; Parameters: "/quiet"; StatusMsg: "Installiere Node.js (x64)..."; Flags: shellexec waituntilterminated; Check: ShouldInstallNodeX64
#endif
#ifdef WithNodeInstallerARM64
Filename: "{tmp}\node-v24.11.1-arm64.msi"; Parameters: "/quiet"; StatusMsg: "Installiere Node.js (ARM64)..."; Flags: shellexec waituntilterminated; Check: ShouldInstallNodeARM64
#endif

[Code]
#ifdef WithNodeInstaller
function IsNodeInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec(ExpandConstant('{cmd}'), '/C node --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function GetProcessorArchitecture(): String;
var
  Arch: String;
begin
  Arch := GetEnv('PROCESSOR_ARCHITECTURE');
  if (Arch = 'AMD64') or (Arch = 'x86') then
    Result := 'x64'
  else if (Arch = 'ARM64') then
    Result := 'ARM64'
  else
    Result := 'x64'; // Default fallback
end;

function ShouldInstallNodeX64(): Boolean;
begin
  Result := not IsNodeInstalled() and (GetProcessorArchitecture() = 'x64');
end;

function ShouldInstallNodeARM64(): Boolean;
begin
  Result := not IsNodeInstalled() and (GetProcessorArchitecture() = 'ARM64');
end;
#endif

