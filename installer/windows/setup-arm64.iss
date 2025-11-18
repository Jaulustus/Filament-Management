; Inno Setup Script for FilaHub (ARM64)
; Requires Inno Setup 6+
; Downloads application files from GitHub Releases

#define MyAppName "FilaHub"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "Jaulustus"
#define MyAppExeName "FilaHub.exe"
#define MyAppURL "https://github.com/Jaulustus/Filament-Management"
#define GitHubReleaseURL "https://github.com/Jaulustus/Filament-Management/releases/download/v{#MyAppVersion}"
#define NodeInstallerARM64 "dependencies\node-v24.11.1-arm64.msi"

#ifexist {#NodeInstallerARM64}
  #define WithNodeInstaller
#endif

[Setup]
AppId={{2A9C8777-1F1F-4C8A-8D05-6F8A2E8E3A0C}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={pf}\FilaHub
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\dist\windows\installer
OutputBaseFilename=FilaHubSetup_ARM64
Compression=lzma
SolidCompression=yes
SetupIconFile=..\..\assets\icons\app.ico
WizardStyle=modern
PrivilegesRequired=admin
LicenseFile=..\..\installer\windows\license.txt

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checked

[Files]
; Node.js Installer (falls vorhanden)
#ifdef WithNodeInstaller
Source: "{#NodeInstallerARM64}"; DestDir: "{tmp}"; Flags: deleteafterinstall
#endif

[Icons]
; Startmenü-Verknüpfung (immer erstellt)
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
; Desktop-Verknüpfung (standardmäßig aktiviert)
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Installiere Node.js falls nötig
#ifdef WithNodeInstaller
Filename: "{tmp}\node-v24.11.1-arm64.msi"; Parameters: "/quiet"; StatusMsg: "Installing Node.js (ARM64)..."; Flags: shellexec waituntilterminated; Check: ShouldInstallNode
#endif
; Starte FilaHub nach Installation
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DownloadPage: TDownloadWizardPage;

function OnDownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  if Progress = ProgressMax then
    Log(Format('Successfully downloaded %s', [FileName]));
  Result := True;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(SetupMessage(msgWizardPreparing), SetupMessage(msgPreparingDesc), @OnDownloadProgress);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  DownloadURL: String;
  FileName: String;
begin
  if CurPageID = wpReady then
  begin
    DownloadPage.Clear;
    
    // Download FilaHub.exe von GitHub
    DownloadURL := '{#GitHubReleaseURL}/FilaHub.exe';
    FileName := 'FilaHub.exe';
    DownloadPage.Add(DownloadURL, FileName, '');
    
    // Download package.json
    DownloadURL := '{#GitHubReleaseURL}/package.json';
    FileName := 'package.json';
    DownloadPage.Add(DownloadURL, FileName, '');
    
    // Download package-lock.json (falls vorhanden)
    DownloadURL := '{#GitHubReleaseURL}/package-lock.json';
    FileName := 'package-lock.json';
    DownloadPage.Add(DownloadURL, FileName, '');
    
    // Download prisma Ordner als ZIP
    DownloadURL := '{#GitHubReleaseURL}/prisma.zip';
    FileName := 'prisma.zip';
    DownloadPage.Add(DownloadURL, FileName, '');
    
    // Download src Ordner als ZIP
    DownloadURL := '{#GitHubReleaseURL}/src.zip';
    FileName := 'src.zip';
    DownloadPage.Add(DownloadURL, FileName, '');
    
    // Download lang Ordner als ZIP
    DownloadURL := '{#GitHubReleaseURL}/lang.zip';
    FileName := 'lang.zip';
    DownloadPage.Add(DownloadURL, FileName, '');
    
    // Download .env.example
    DownloadURL := '{#GitHubReleaseURL}/.env.example';
    FileName := '.env.example';
    DownloadPage.Add(DownloadURL, FileName, '');
    
    try
      try
        DownloadPage.Show;
        try
          if DownloadPage.Download then
          begin
            // Entpacke ZIP-Dateien
            ExtractTemporaryFile('prisma.zip');
            ExtractTemporaryFile('src.zip');
            ExtractTemporaryFile('lang.zip');
            
            // Verschiebe Dateien ins Installationsverzeichnis
            FileCopy(ExpandConstant('{tmp}\FilaHub.exe'), ExpandConstant('{app}\FilaHub.exe'), False);
            FileCopy(ExpandConstant('{tmp}\package.json'), ExpandConstant('{app}\package.json'), False);
            if FileExists(ExpandConstant('{tmp}\package-lock.json')) then
              FileCopy(ExpandConstant('{tmp}\package-lock.json'), ExpandConstant('{app}\package-lock.json'), False);
            FileCopy(ExpandConstant('{tmp}\.env.example'), ExpandConstant('{app}\.env.example'), False);
            
            // Entpacke ZIP-Dateien mit PowerShell
            if Exec('powershell.exe', '-NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path ''' + ExpandConstant('{tmp}\prisma.zip') + ''' -DestinationPath ''' + ExpandConstant('{app}\prisma') + ''' -Force"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
            begin
              if Exec('powershell.exe', '-NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path ''' + ExpandConstant('{tmp}\src.zip') + ''' -DestinationPath ''' + ExpandConstant('{app}\src') + ''' -Force"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
              begin
                if Exec('powershell.exe', '-NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path ''' + ExpandConstant('{tmp}\lang.zip') + ''' -DestinationPath ''' + ExpandConstant('{app}\lang') + ''' -Force"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
                begin
                  Result := True;
                end
                else
                begin
                  Result := False;
                  MsgBox('Failed to extract lang.zip', mbError, MB_OK);
                end;
              end
              else
              begin
                Result := False;
                MsgBox('Failed to extract src.zip', mbError, MB_OK);
              end;
            end
            else
            begin
              Result := False;
              MsgBox('Failed to extract prisma.zip', mbError, MB_OK);
            end;
          end
          else
          begin
            Result := False;
            MsgBox('Download failed. Please check your internet connection.', mbError, MB_OK);
          end;
        finally
          DownloadPage.Hide;
        end;
      except
        Result := False;
        MsgBox('An error occurred during download.', mbError, MB_OK);
      end;
    finally
    end;
  end
  else
    Result := True;
end;

function IsNodeInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec(ExpandConstant('{cmd}'), '/C node --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function ShouldInstallNode(): Boolean;
begin
  Result := not IsNodeInstalled();
end;

