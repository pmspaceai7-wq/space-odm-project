from pathlib import Path
from PIL import Image, ImageDraw
import io
import rawpy

root=Path('/work')
samples=[]
for p in sorted((root/'raw-check').glob('*.DNG')):
    try:
        with rawpy.imread(str(p)) as raw:
            thumb=raw.extract_thumb()
            im=Image.open(io.BytesIO(thumb.data)) if thumb.format==rawpy.ThumbFormat.JPEG else Image.fromarray(thumb.data)
            im.convert('RGB').save(p.with_suffix('.preview.jpg'))
            samples.append((p.name,im.copy()))
    except Exception as e: print(p.name,str(e))
photos=sorted((root/'images').glob('*.JPG'))
for p in photos[::8]+photos[-12:]:
    try:
        im=Image.open(p)
        print(p.name,im.getexif().get(306,''))
        samples.append((p.name,im.copy()))
    except Exception as e: print(p.name,str(e))
w,h=360,290
out=Image.new('RGB',(w*4,h*((len(samples)+3)//4)), '#dddddd')
draw=ImageDraw.Draw(out)
for i,(name,im) in enumerate(samples):
    im.thumbnail((w,h-24))
    x,y=(i%4)*w,(i//4)*h
    out.paste(im,(x,y+24));draw.text((x+5,y+5),name,fill='black')
out.save(root/'contact-sheet.jpg')
