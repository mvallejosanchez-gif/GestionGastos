from playwright.sync_api import sync_playwright
import time
from datetime import datetime
import glob
import os
import tempfile
import shutil

CARPETA_DESCARGA = r"C:\Users\mvall\Workspaces\GestionGastos\input"
CHROME_USER_DATA = os.path.join(os.getenv('LOCALAPPDATA'), r"Google\Chrome\User Data")

def limpiar_movimientos_anteriores():
    """Elimina archivos anteriores de movimientos de la carpeta input"""
    archivos_antiguos = glob.glob(f"{CARPETA_DESCARGA}\\*Últimos movimientos.xlsx")
    for archivo in archivos_antiguos:
        try:
            os.remove(archivo)
            print(f"🗑️  Eliminado: {os.path.basename(archivo)}")
        except Exception as e:
            print(f"⚠️  Error al eliminar {archivo}: {e}")

def descargar_bbva():
    # Limpiar archivos anteriores
    limpiar_movimientos_anteriores()
    
    print("⚠️  IMPORTANTE: Cierra Chrome completamente")
    print("    (Presiona Ctrl+Q en Chrome para cerrar completamente)")
    input("Presiona ENTER cuando hayas cerrado Chrome...")
    
    with sync_playwright() as p:
        try:
            # Usar tu sesión real de Chrome
            print("📂 Abriendo Chrome con tu sesión...")
            # Intentar con el perfil real; si falla, usar perfil temporal
            temp_profile = None
            try:
                context = p.chromium.launch_persistent_context(
                    user_data_dir=CHROME_USER_DATA,
                    headless=False,
                    accept_downloads=True,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                    ]
                )
            except Exception as inner_e:
                print(f"⚠️  No se pudo usar el perfil de Chrome ({CHROME_USER_DATA}): {inner_e}")
                print("⚠️  Lanzando Chrome con perfil temporal. Inicia sesión manualmente cuando abra el navegador.")
                temp_profile = tempfile.mkdtemp(prefix="bbva_profile_")
                context = p.chromium.launch_persistent_context(
                    user_data_dir=temp_profile,
                    headless=False,
                    accept_downloads=True,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                    ]
                )
            page = context.new_page()
            
            # Ir a BBVA
            print("🔄 Navigando a BBVA...")
            page.goto("https://www.bbva.es/personas.html")
            # time.sleep(3)
            
                   
            # Esperar a que el usuario descargue el archivo
            with page.expect_download(timeout=60000) as download_info:
                print("⏳ Esperando descarga... (máximo 60 segundos)")
                # El usuario hará clic en descargar
                download = download_info.value
            
            # Guardar el archivo
            filename = f"BBVA_{datetime.now().strftime('%Y_%m_%d')}_Últimos movimientos.xlsx"
            filepath = f"{CARPETA_DESCARGA}\\{filename}"
            download.save_as(filepath)
            
            print(f"\n✅ Archivo descargado correctamente: {filename}")
            print(f"   Ubicación: {filepath}")
            
            print("\n💾 Cerrando navegador en 5 segundos...")
            time.sleep(5)
            context.close()
            # Limpiar perfil temporal si se creó
            try:
                if 'temp_profile' in locals() and temp_profile:
                    shutil.rmtree(temp_profile)
            except Exception:
                pass
        
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("\nSoluciones:")
            print("   • Chrome debe estar completamente cerrado (Ctrl+Q)")
            print("   • Verifica que tu conexión a BBVA esté activa")
            print("   • Prueba cerrando y abriendo Chrome manualmente primero")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    descargar_bbva()
