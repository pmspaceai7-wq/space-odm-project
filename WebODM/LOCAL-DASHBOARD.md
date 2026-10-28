# Local mapping dashboard

Open http://localhost:8000 while Docker Desktop is running.

On your first visit, create your local administrator username and password. Then create a project, choose **Select Images and GCP**, select the survey photos, review the processing options, and start processing. The task page shows progress and provides map, 3D, and download links when processing finishes.

To try the existing sample, select all 18 JPG files from:

`C:\Users\vivom\Drone project\datasets\brighton-beach\images`

For a first sample run, use medium feature quality, low point-cloud quality, and a 10 cm orthophoto resolution. Enable DSM if you want an elevation model. This installation processes one task at a time and limits processing concurrency to four.

## Start, stop, and status

Run in PowerShell from this folder:

```powershell
.\dashboard.ps1 start
.\dashboard.ps1 status
.\dashboard.ps1 logs
.\dashboard.ps1 stop
```

Stopping preserves projects and results. The containers also restart when Docker starts unless you explicitly stopped them.

The dashboard listens only on this computer at port 8000. Projects, database records, and processing files are stored in Docker named volumes under the `drone-webodm` Compose project. Do not delete these volumes if you want to keep your work.

This is the current WebODM distribution with its ODX processing engine. The separate `ODM` checkout and previously generated files in `datasets` are not automatically imported into WebODM. Uploading the sample photos creates a new processing task.

Official documentation: https://docs.webodm.org/installation/
