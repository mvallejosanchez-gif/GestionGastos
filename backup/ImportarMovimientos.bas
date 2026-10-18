Attribute VB_Name = "ImportarMovimientos"
' ============================================================
' Módulo: ImportarMovimientos
' Descripción: Lanza el script Python importar_movimientos.py
'              desde un botón en Excel y muestra el resultado.
' Instrucciones de instalación:
'   1. En Excel, abre el editor VBA (Alt+F11)
'   2. Inserta un nuevo módulo (Insertar > Módulo)
'   3. Pega el contenido de este fichero
'   4. Cierra el editor y añade un botón en cualquier hoja
'      (Insertar > Formas o controles de formulario)
'   5. Asigna la macro "ImportarMovimientos" al botón
' ============================================================

Public Sub ImportarMovimientos()

    ' ── CONFIGURACIÓN ──────────────────────────────────────
    Const PYTHON_EXE As String = "python"   ' o ruta completa, ej: "C:\Python312\python.exe"
    Const SCRIPT     As String = "C:\Users\mvall\Workspaces\GestionGastos\importar_movimientos.py"
    ' ───────────────────────────────────────────────────────

    Dim sCmd     As String
    Dim sOutput  As String
    Dim sTmpFile As String
    Dim iFile    As Integer
    Dim sLine    As String

    ' Fichero temporal para capturar la salida del script
    sTmpFile = Environ("TEMP") & "\importar_output.txt"

    ' Construir comando: redirige stdout+stderr al fichero temporal
    sCmd = PYTHON_EXE & " """ & SCRIPT & """ > """ & sTmpFile & """ 2>&1"

    ' Guardar el libro antes de lanzar el script
    If ThisWorkbook.Saved = False Then
        If MsgBox("El libro tiene cambios sin guardar." & vbCrLf & _
                  "¿Guardar antes de importar?", _
                  vbYesNo + vbQuestion, "Importar movimientos") = vbYes Then
            ThisWorkbook.Save
        End If
    End If

    ' Deshabilitar pantalla durante el proceso
    Application.ScreenUpdating = False
    Application.StatusBar = "Importando movimientos... (puede tardar unos segundos)"

    ' Ejecutar el script (Shell asíncrono → usamos WScript.Shell para esperar)
    Dim oShell As Object
    Set oShell = CreateObject("WScript.Shell")
    Dim exitCode As Long
    exitCode = oShell.Run("cmd /c " & sCmd, 0, True)   ' True = esperar a que termine
    Set oShell = Nothing

    Application.StatusBar = False
    Application.ScreenUpdating = True

    ' Leer salida del script
    sOutput = ""
    If Dir(sTmpFile) <> "" Then
        iFile = FreeFile
        Open sTmpFile For Input As #iFile
        Do While Not EOF(iFile)
            Line Input #iFile, sLine
            sOutput = sOutput & sLine & vbCrLf
        Loop
        Close #iFile
        Kill sTmpFile
    End If

    ' Refrescar los datos del libro (tablas dinámicas, conexiones)
    On Error Resume Next
    ThisWorkbook.RefreshAll
    On Error GoTo 0

    ' Mostrar resultado
    Dim titulo As String
    If exitCode = 0 Then
        titulo = "✓ Importación completada"
    Else
        titulo = "⚠ El script terminó con errores (código " & exitCode & ")"
    End If

    MsgBox sOutput, vbInformation, titulo

End Sub


' ── Función auxiliar: abrir la carpeta input en el Explorador ──
Public Sub AbrirCarpetaInput()
    Const INPUT_DIR As String = "C:\Users\mvall\Workspaces\GestionGastos\input"
    Shell "explorer.exe """ & INPUT_DIR & """", vbNormalFocus
End Sub
