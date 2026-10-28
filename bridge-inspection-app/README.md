# pmspace.ai Bridge Inspection

A standalone company demonstration built using the existing ODM/WebODM survey outputs as reference. The upstream projects and original viewer remain separate.

## Run locally

Requires Node.js 24.18 or newer and npm. From this directory:

```powershell
npm ci
npm run import-demo
npm start
```

Open http://127.0.0.1:8770. Choose **Enter as inspector**; no password is needed in local demo mode. The demo import copies the existing `../outputs/rivaz-bridge` assets into this application's `storage/demo`. It does not reconstruct a new survey. On this computer those assets have already been imported.

## Demonstration walkthrough

1. Open the Rivaz project. Orbit the textured 3D model, view the orthophoto, or choose **Find the bridges**.
2. Open **Photo observations**, drag a rectangle on the source photograph, describe the evidence and save a draft. Keyboard percentage inputs are also available.
3. In **Findings**, submit the observation for review.
4. Use the sidebar sign-out button and enter as reviewer. Open **Review queue**, inspect the evidence and accept or reject with a comment.
5. Open the project's **Reports & outputs** tab and issue a report after accepting an observation. Open the HTML report and use Print / Save as PDF, or download the self-contained HTML.

## Implemented

- Branded responsive dashboard and project records.
- Real imported Rivaz model, orthophoto, bridge close-up and source image.
- Server-persisted manual photo observations, review decisions and event history.
- Inspector/reviewer permissions, project membership, sessions and CSRF validation.
- Report snapshots and authenticated survey downloads.
- SQLite persistence across restarts.

## Scope and remaining work

This is a working single-company POC. New project creation stores metadata; attaching new surveys and automatic WebODM job submission are not yet connected. **Open WebODM** opens the separate processing application. AI defect detection, calibrated crack measurements, BIM/IFC alignment, organization management and email invitations are not implemented. Image labels are human observations, not verified structural diagnoses. The reduced-resolution sample is appropriate for demonstrating the workflow, not fine defect measurement.

Rivaz sample imagery is credited to Pix4D. Preserve attribution and check dataset redistribution terms before distributing the sample outside the demo.

## Structure

- `server.mjs`: HTTP API, sessions, permissions and protected asset delivery.
- `lib/db.mjs`: SQLite schema and initial users/projects.
- `lib/report.mjs`: escaped, printable report rendering.
- `public/`: browser UI and Three.js 3D viewer; no external CDN required.
- `storage/`: database, SQLite WAL files and copied survey artifacts. Back up this directory; do not commit it.
- `tests/`: isolated API lifecycle and Chrome browser workflow tests.

```powershell
npm test
npm run test:browser
```

Browser tests require installed Google Chrome. They use temporary databases and save screenshots under `test-results/screenshots`.

## Private Contabo demo deployment

Deploy this UI/API independently from WebODM processing. A single Node process and SQLite are suitable for a small POC; processing capacity is a separate concern. Use a fresh deployment database so the configured initial passwords are applied. Password environment variables seed users only when their records are first created; changing them does not reset existing accounts.

1. Copy the application and imported `storage/demo` directory to the server. Do not copy the local demonstration database.
2. Copy `.env.production.example` to `.env.production` and replace the domain, account emails and both passwords.
3. Run `docker compose --env-file .env.production up -d --build`.
4. Put your HTTPS reverse proxy in front of `127.0.0.1:8770`. Use the exact public HTTPS origin in `PUBLIC_ORIGIN`; point `WEBODM_URL` at your separately secured WebODM address.
5. Back up the storage directory consistently, stopping the application during a simple filesystem backup. Verify a restore before relying on it.

The container disables demo login. Remote deployment configuration is provided but has not been exercised on your Contabo server. Before broader production use, add account/password administration, operational monitoring, backup automation, organization isolation and an import/job workflow. Existing sessions last eight hours.
