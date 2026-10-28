"""Submit the Pix4D Rivaz training photos using WebODM's task API."""
import json
from pathlib import Path
from contextlib import ExitStack
from django.contrib.auth.models import User
from app.models import Project, Task
from app.api.tasks import TaskViewSet
from rest_framework.test import APIRequestFactory, force_authenticate

owner=Project.objects.get(pk=2,name='dron').owner
project,_=Project.objects.get_or_create(name='Rivaz bridge - Switzerland',owner=owner,defaults={
    'description':'Training reconstruction from 101 aerial photos. Courtesy of Pix4D / https://pix4d.com. https://support.pix4d.com/hc/en-us/articles/360000235126'
})
name='Rivaz bridge and village - aerial survey'
existing=Task.objects.filter(project=project,name=name).first()
if existing:
    print(json.dumps({'id':str(existing.id),'project':project.id,'status':existing.status,'existing':True}))
else:
    photos=sorted(Path('/tmp/rivaz-bridge-images').glob('*.JPG'))
    assert len(photos)==101,len(photos)
    options=[
        {'name':'feature-quality','value':'medium'},
        {'name':'pc-quality','value':'low'},
        {'name':'orthophoto-resolution','value':10},
        {'name':'mesh-octree-depth','value':8},
        {'name':'mesh-size','value':200000},
        {'name':'max-concurrency','value':4},
        {'name':'dsm','value':True},
        {'name':'optimize-disk-space','value':True},
    ]
    with ExitStack() as stack:
        files=[stack.enter_context(p.open('rb')) for p in photos]
        request=APIRequestFactory().post(f'/api/projects/{project.id}/tasks/',{
            'name':name,'images':files,'options':json.dumps(options),'auto_processing_node':'true'
        },format='multipart')
        force_authenticate(request,user=owner)
        response=TaskViewSet.as_view({'post':'create'})(request,project_pk=str(project.id))
        if response.status_code!=201:
            raise RuntimeError(f'Create failed: {response.status_code} {response.data}')
        print(json.dumps({k:response.data[k] for k in ['id','project','name','images_count','status']}))
