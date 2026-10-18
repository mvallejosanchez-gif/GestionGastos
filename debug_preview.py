from importar_input import collect_input_rows, preview_import_files
from pathlib import Path
import json

input_dir = Path('input')
print('exist', input_dir.exists())
print('files', sorted(p.name for p in input_dir.iterdir() if p.is_file()))
rows, files = collect_input_rows(input_dir)
print('parsed rows', len(rows), 'files', files)
for i, row in enumerate(rows[:3]):
    print('ROW', i, row)
print(json.dumps(preview_import_files(), ensure_ascii=False, indent=2)[:4000])
