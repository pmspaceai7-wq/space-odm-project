from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, struct

root=Path('/tmp/rivaz-bridge-output')
im=Image.open(root/'map-preview.png').convert('RGB')
im=im.crop((450,880,1000,1400)).resize((1100,1040),Image.Resampling.LANCZOS)
d=ImageDraw.Draw(im)
try:
    font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',28)
    small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
except OSError:
    font=small=ImageFont.load_default()
def mark(text,box,label,line):
    d.ellipse(box,outline='#ffcd43',width=6)
    d.line(line,fill='#ffcd43',width=5)
    x,y=label
    b=d.textbbox((x,y),text,font=font)
    d.rectangle((b[0]-12,b[1]-10,b[2]+12,b[3]+10),fill='#142838')
    d.text((x,y),text,fill='white',font=font)
mark('Road bridge',(360,240,570,385),(36,80),[(240,120),(445,240)])
mark('Railway bridge',(390,590,570,755),(34,845),[(235,840),(450,755)])
d.rectangle((0,992,1100,1040),fill='#142838')
d.text((18,1003),'Reconstructed map | Rivaz, Switzerland | Photos courtesy of Pix4D',fill='white',font=small)
im.save(root/'bridge-closeup.png')

data=(root/'rivaz-3d-model.glb').read_bytes()
magic,version,total=struct.unpack_from('<4sII',data)
assert magic==b'glTF' and version==2 and total==len(data)
size,kind=struct.unpack_from('<I4s',data,12)
doc=json.loads(data[20:20+size])
print({'GLB_version':version,'meshes':len(doc.get('meshes',[])),'materials':len(doc.get('materials',[])),'images':len(doc.get('images',[]))})
