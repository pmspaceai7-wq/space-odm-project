import json
import shutil
import subprocess
from pathlib import Path
from app.models import Task

task=Task.objects.get(pk='5dcfa7d7-7bb7-475e-81b3-20d7047548e0')
assert task.status==40, f'Task is not complete: {task.status} {task.last_error}'
dest=Path('/tmp/rivaz-bridge-output')
dest.mkdir(exist_ok=True)
files={
    'orthophoto.tif':'rivaz-map.tif',
    'textured_model.glb':'rivaz-3d-model.glb',
    'georeferenced_model.laz':'rivaz-point-cloud.laz',
    'report.pdf':'processing-report.pdf',
}
for asset,name in files.items():
    src=Path(task.assets_path(task.ASSETS_MAP[asset]))
    assert src.is_file() and src.stat().st_size>0,src
    shutil.copy2(src,dest/name)
subprocess.run(['gdal_translate','-of','PNG','-outsize','1800','0',str(dest/'rivaz-map.tif'),str(dest/'map-preview.png')],check=True)
summary={'task':str(task.id),'project':task.project_id,'images':task.images_count,'statistics':task.get_statistics(),'map':task.get_map_items()}
(dest/'processing-summary.json').write_text(json.dumps(summary,indent=2,default=str))
print(json.dumps({'output':str(dest),'files':[{ 'name':p.name,'bytes':p.stat().st_size} for p in dest.iterdir()]}))
