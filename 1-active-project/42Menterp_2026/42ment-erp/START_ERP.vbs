Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strLauncherPath = strScriptPath & "\launcher.py"

' Check if launcher.py exists
If objFSO.FileExists(strLauncherPath) Then
    ' Run the launcher without showing console window
    WshShell.Run "python """ & strLauncherPath & """", 0, False
Else
    MsgBox "launcher.py not found!" & vbCrLf & "Path: " & strLauncherPath, vbCritical, "42ment ERP"
End If
