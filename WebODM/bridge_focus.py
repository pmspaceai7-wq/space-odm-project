import json, math
from pathlib import Path
from PIL import Image, ImageDraw
from app.models import Task

t=Task.objects.get(pk='f0c08aee-b58e-4050-bae7-996e7fa32eb5')
photos=sorted(Path(t.task_path('')).glob('*.JPG'))
def gps(p):
    with Image.open(p) as im:
        g=im.getexif().get_ifd(34853)
        def deg(v): return float(v[0])+float(v[1])/60+float(v[2])/3600
        return deg(g[2])*(-1 if g[1]=='S' else 1),deg(g[4])*(-1 if g[3]=='W' else 1)
center=gps(next(p for p in photos if p.name.endswith('_0552.JPG')))
def distance(p):
    lat,lon=gps(p)
    return math.hypot((lat-center[0])*111320,(lon-center[1])*111320*math.cos(math.radians(lat)))
chosen=sorted(photos,key=distance)[:36]
dest=Path('/tmp/bridge-focus');dest.mkdir(exist_ok=True)
for p in chosen:
    with Image.open(p) as im:
        exif=im.info.get('exif')
        im.thumbnail((1600,1600))
        im.save(dest/p.name,quality=94,exif=exif)
print(json.dumps({'center':center,'count':len(chosen),'max_distance_m':distance(chosen[-1]),'files':[p.name for p in chosen]}))
