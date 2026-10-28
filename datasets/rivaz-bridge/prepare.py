from pathlib import Path
from PIL import Image, ImageDraw
import zipfile
import io

root=Path('/work')
dest=root/'images'
dest.mkdir(exist_ok=True)
previews=[]
with zipfile.ZipFile(root/'source.zip') as archive:
    photos=[n for n in archive.namelist() if n.lower().endswith(('.jpg','.jpeg')) and '/images/' in n]
    assert len(photos)==101, len(photos)
    for i,name in enumerate(photos):
        target=dest/Path(name).name
        with archive.open(name) as source:
            im=Image.open(io.BytesIO(source.read()))
            exif=im.info.get('exif',b'')
            im.thumbnail((2400,2400),Image.Resampling.LANCZOS)
            im.save(target,quality=94,exif=exif)
            if i%7==0:
                preview=im.copy();preview.thumbnail((320,230));previews.append((target.name,preview))
        if (i+1)%20==0: print('Prepared',i+1,flush=True)
sheet=Image.new('RGB',(1280,260*((len(previews)+3)//4)),'#dddddd')
draw=ImageDraw.Draw(sheet)
for i,(name,im) in enumerate(previews):
    x,y=(i%4)*320,(i//4)*260
    draw.text((x+4,y+4),name,fill='black');sheet.paste(im,(x,y+24))
sheet.save(root/'contact-sheet.jpg')
print('Prepared 101 geotagged photos',flush=True)
