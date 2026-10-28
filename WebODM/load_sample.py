"""Submit the public Brighton Beach sample through WebODM's task API view."""
import json
from pathlib import Path
from contextlib import ExitStack
from app.models import Project, Task
from app.api.tasks import TaskViewSet
from rest_framework.test import APIRequestFactory, force_authenticate

project = Project.objects.get(pk=2, name='dron')
name = 'Brighton Beach - sample map'
existing = Task.objects.filter(project=project, name=name).first()
if existing:
    print(json.dumps({'id':str(existing.id), 'status':existing.status, 'existing':True}))
else:
    photos = sorted(Path('/tmp/brighton-sample-images').glob('*.JPG'))
    assert len(photos) == 18, f'Expected 18 sample photos, found {len(photos)}'
    options = [
        {'name':'feature-quality', 'value':'medium'},
        {'name':'pc-quality', 'value':'low'},
        {'name':'orthophoto-resolution', 'value':10},
        {'name':'mesh-octree-depth', 'value':9},
        {'name':'max-concurrency', 'value':4},
        {'name':'dsm', 'value':True},
    ]
    with ExitStack() as stack:
        files = [stack.enter_context(p.open('rb')) for p in photos]
        request = APIRequestFactory().post(f'/api/projects/{project.id}/tasks/', {
            'name':name, 'images':files, 'options':json.dumps(options),
            'auto_processing_node':'true'
        }, format='multipart')
        force_authenticate(request, user=project.owner)
        response = TaskViewSet.as_view({'post':'create'})(request, project_pk=str(project.id))
        if response.status_code != 201:
            raise RuntimeError(f'Task creation failed: {response.status_code} {response.data}')
        print(json.dumps({k:response.data[k] for k in ['id','name','images_count','status']}))
