import json
from pathlib import Path
from contextlib import ExitStack
from app.models import Project, Task
from app.api.tasks import TaskViewSet
from rest_framework.test import APIRequestFactory, force_authenticate

project=Project.objects.get(pk=3)
name='Bridge close-up - Rivaz road and railway'
existing=Task.objects.filter(project=project,name=name).first()
if existing:
    print(json.dumps({'id':str(existing.id),'status':existing.status,'existing':True}))
else:
    photos=sorted(Path('/tmp/bridge-focus').glob('*.JPG'))
    assert len(photos)==36,len(photos)
    options=[{'name':n,'value':v} for n,v in [
        ('feature-quality','medium'),('pc-quality','low'),
        ('orthophoto-resolution',15),('mesh-octree-depth',8),
        ('mesh-size',100000),('max-concurrency',4),('optimize-disk-space',True),
    ]]
    with ExitStack() as stack:
        files=[stack.enter_context(p.open('rb')) for p in photos]
        req=APIRequestFactory().post(f'/api/projects/{project.id}/tasks/',{
            'name':name,'images':files,'options':json.dumps(options),'auto_processing_node':'true'
        },format='multipart')
        force_authenticate(req,user=project.owner)
        res=TaskViewSet.as_view({'post':'create'})(req,project_pk=str(project.id))
        assert res.status_code==201,res.data
        print(json.dumps({k:res.data[k] for k in ['id','project','name','images_count','status']}))
