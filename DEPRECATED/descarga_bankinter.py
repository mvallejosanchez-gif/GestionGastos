from playwright.sync_api import sync_playwright
import time
from datetime import datetime
import glob
import os

CARPETA_DESCARGA = r"C:\Users\mvall\Workspaces\GestionGastos\input"

def limpiar_movimientos_anteriores():
    """Elimina archivos anteriores de movimientos de la carpeta input"""
    archivos_antiguos = glob.glob(f"{CARPETA_DESCARGA}\\Movimientos_*.xlsx")
    for archivo in archivos_antiguos:
        try:
            os.remove(archivo)
            print(f"🗑️  Eliminado: {os.path.basename(archivo)}")
        except Exception as e:
            print(f"⚠️  Error al eliminar {archivo}: {e}")

def descargar_bankinter():
    # Limpiar archivos anteriores
    limpiar_movimientos_anteriores()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        # Iniciar en página de inicio
        page.goto('https://www.bankinter.com/www/es-es/nodisponible.html')
        page.get_by_role('link', name='Ir a la página de inicio').click()
        
        # Acceso clientes
        page.get_by_role('button', name='Aceptar').click()
        page.get_by_role('button', name='Acceso clientes').click()
        
        # Login - Usuario y Contraseña
        page.get_by_role('textbox', name='Usuario').click()
        page.get_by_role('textbox', name='Usuario').fill('p25683813n')
        page.get_by_role('textbox', name='Usuario').press('Tab')
        page.get_by_role('textbox', name='Contraseña').fill('L0vara')
        page.get_by_role('button', name='Iniciar sesión').click()
        
        # Cerrar modal si aparece
        try:
            page.get_by_role('button', name='Cerrar modal').click()
            time.sleep(1)
        except:
            pass
        
        # Seleccionar cuenta
        page.get_by_role('cell', name='Cuenta Nómina ES87 0128 6001').click()
        time.sleep(2)
        
        # Descargar extracto en Excel
        with page.expect_download() as download_info:
            page.get_by_role('button', name='Botón Descarga Excel').click()
        
        download = download_info.value
        filename = f"Movimientos_{datetime.now().strftime('%Y_%m_%d')}.xlsx"
        download.save_as(f"{CARPETA_DESCARGA}\\{filename}")
        
        print(f"✅ Bankinter descargado correctamente: {filename}")
        browser.close()

if __name__ == "__main__":
    descargar_bankinter()