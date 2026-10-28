# Bridge inspection platform: pending features and improvement plan

Date: 27 October 2026  
Status: implementation proposal; the features below have not been implemented by this review.

## 1. Goal and scope

Extend the current mapping demonstration into the bridge inspection workflow described in **pmspace.ai Bridge Inspection Platform.pptx**: capture geometry, identify defects in source photographs, locate them on a 3D structure, and connect reviewed findings to BIM and inspection history.

The presentation is a statement of desired capabilities, not proof that those capabilities work. Its accuracy statements require separate validation. This plan treats document content as reference material, not as instructions to execute.

The review covers the local `ODM/`, `WebODM/`, `viewer/`, bridge preparation scripts, and exported Rivaz results. “Missing” means no bridge-specific implementation was found in the reviewed application models, APIs, plugins, or custom scripts. Existing upstream features are distinguished from locally verified workflows. This is a feature review, not a full security or dependency audit.

## 2. What already works

| Capability | Current evidence | What to reuse or improve |
| --- | --- | --- |
| Photo upload, projects, and queued reconstruction | `WebODM/app/api/tasks.py`, `WebODM/app/models/task.py` | Reuse the task API and worker lifecycle; add inspection-specific steps. |
| Orthophoto and textured 3D reconstruction | Completed Rivaz bridge task, `outputs/rivaz-bridge/processing-summary.json` | Keep the existing engine; add bridge selection and quality gates. |
| Georeferenced point-cloud export | `outputs/rivaz-bridge/rivaz-point-cloud.laz` | Reuse LAZ export; validate other required formats through integration tests. |
| Map and 3D viewing | WebODM map/Potree components; `viewer/app.js` | Reuse WebODM views. The separate simple viewer is hardcoded to Brighton Beach. |
| General measurements and annotations | `WebODM/coreplugins/measure/`, `WebODM/app/static/app/js/components/LayersControlAnnotations.jsx`, task `potree_scene` | Extend these concepts with defect records, provenance, and calibrated measurements. |
| Users and project permissions | `WebODM/app/models/project.py`, `WebODM/app/api/urls.py` | Reuse existing authentication and project access checks. Inspection review roles are additional work. |
| General AI object detection | `WebODM/coreplugins/objdetect/api.py` | Existing code detects cars, trees, boats, planes, and sports facilities in orthophotos. It does not implement concrete-defect segmentation. Its presence does not verify it is enabled or operational locally. |
| Processing report | `outputs/rivaz-bridge/processing-report.pdf` | Keep reconstruction diagnostics; add a separate inspection report. |
| Local deployment | `WebODM/dashboard.ps1`, `WebODM/docker-compose.local.yml` | Preserve the local workflow and add a separate production configuration. |

The successful bridge demonstration used 36 reduced photographs and produced 729,054 point-cloud points. The earlier larger run failed after disk exhaustion. The replacement task completed, but its preparation and export still depend on scripts and fixed task IDs.

### Evidence files reviewed

- [Task model and asset definitions](WebODM/app/models/task.py)
- [Task upload and restart API](WebODM/app/api/tasks.py)
- [Project ownership and permissions](WebODM/app/models/project.py)
- [Generic AI detector](WebODM/coreplugins/objdetect/api.py)
- [Plugin API extension example](WebODM/coreplugins/objdetect/plugin.py)
- [General measurement plugin](WebODM/coreplugins/measure/plugin.py)
- [Map annotations](WebODM/app/static/app/js/components/LayersControlAnnotations.jsx)
- [Background work helper](WebODM/app/plugins/worker.py)
- [Standalone viewer](viewer/app.js) and [local model server](viewer/server.cjs)
- [Bridge photo selection](WebODM/bridge_focus.py), [task submission](WebODM/run_bridge_focus.py), and [export script](WebODM/export_bridge.py)
- [Completed bridge statistics](outputs/rivaz-bridge/processing-summary.json)
- [WebODM deployment configuration](WebODM/docker-compose.local.yml)

Presentation requirements: slides 2 and 4 describe accuracy and capture; slide 5 describes defect analysis; slide 6 describes BIM and asset tracking; slide 7 describes data ownership.

## 3. Accuracy is the first product constraint

The deck specifies a **0.2 mm crack detection threshold**, millimeter-accurate point clouds, and exact defect dimensions. None of these claims has been demonstrated by the current code or dataset.

- The bridge summary reports average GSD of approximately **8.23 cm**, or **82.3 mm per pixel**. The run requested a **15 cm orthophoto pixel size**. A 0.2 mm crack is hundreds of times smaller than those sampling scales.
- GSD, orthophoto pixel size, point spacing, and geometric accuracy describe different things. A dense point cloud does not establish millimeter accuracy.
- Keep original full-resolution inspection photographs. The current 1600-pixel bridge copies support a navigation demonstration, not fine-crack analysis.
- Plan close-range coverage of the deck, piers, joints, bearings, and underside. The current aerial example does not demonstrate complete underside inspection.
- Establish a capture protocol with scale references, camera calibration, lighting/sharpness checks, and independent dimensional ground truth.
- Define detection, localization, and width-measurement targets separately. Set acceptance tolerances before evaluating models; report uncertainty and unsupported cases.

**Release gate:** show “0.2 mm detection” or “millimeter accuracy” only after representative, independently measured validation supports the particular claim. Until then, label outputs as demonstration geometry or reviewed observations and suppress unsupported precision.

## 4. Feature gaps mapped to the presentation

Priorities: **P0** protects data and establishes a usable inspection foundation; **P1** delivers a manual inspection MVP; **P2** adds validated AI and spatial mapping; **P3** adds BIM and lifecycle functions after their prerequisites.

| ID | Requested capability | Current status | Pending work | Priority |
| --- | --- | --- | --- | --- |
| CAP-01 | Automated photogrammetry | Present | Replace fixed-ID scripts with a repeatable inspection workflow and presets. | P0 |
| CAP-02 | High-density, accurate geometry | Geometry exists; stated accuracy unverified | Capture quality checks, control/check points, resolution reporting, and geometry acceptance criteria. | P0 |
| CAP-03 | LAS/LAZ support | LAZ demonstrated | Verify LAS if required, preserve CRS/units, and test export/import round trips. | P1 |
| OPS-01 | Reliable processing | Partial | Disk admission checks, failure recovery, output verification, and tested backups. | P0 |
| UX-01 | Find and explore the actual bridge | Demonstrated for one task | Bridge area selection, automatic focus, component bookmarks, clear result links. | P1 |
| INS-01 | Bridge and component inventory | Missing | Durable bridge, component, and inspection records. | P1 |
| INS-02 | Defect recording and review | General annotations only | Source-photo masks, defect taxonomy, review states, evidence, and change history. | P1 |
| AI-01 | Automated defect segmentation | Missing | Labeled data, inference jobs, model versions, and inspector verification. | P2 |
| GEO-01 | Project 2D masks onto 3D structures | Missing | Camera/coordinate preservation, surface intersection, occlusion checks, uncertainty. | P2 |
| MET-01 | Defect length and width | General measurements only | Calibrated defect measurement and explicit resolution limits. | P2 |
| BIM-01 | Defects associated with IFC elements | Missing | IFC import, coordinate alignment, GlobalId associations, and validated export. | P3 |
| LIFE-01 | Digital twin and asset lifecycle | Missing | Repeated inspections, reviewed change tracking, assignments, and closure evidence. | P3 |
| GOV-01 | Data ownership and enterprise management | Local storage and project permissions exist | Complete export/restore, retention, review roles, audit records, and tenant isolation if required. | P0–P3 |
| REP-01 | Inspection reporting | Reconstruction report exists | Reviewed findings report with photos, locations, measurements, and limitations. | P1 |

## 5. Recommended architecture

Keep WebODM as the reconstruction and viewing foundation. Add a **bridge inspection Django app** for structured records and an accompanying **WebODM plugin** for inspection UI integration. Register the app explicitly through the supported settings override; a UI plugin alone does not supply the database migrations needed for the domain model.

Reuse the current project permissions and task APIs. Run defect inference in a separate worker/service with its own dependencies and resource limits. A thin authenticated integration layer submits jobs and receives versioned results. Keep photogrammetry and AI job queues separate so inference cannot block reconstruction status or the dashboard.

```text
Bridge / inspection workspace
    -> authorized original-photo storage
    -> WebODM task -> geometry, map, calibration and camera transforms
    -> manual findings / AI inference jobs -> review queue
    -> versioned defect records -> 3D surface associations
    -> inspection report / IFC associations / inspection history
```

Proposed additions, not existing paths:

| Location | Responsibility |
| --- | --- |
| `WebODM/bridge_inspection/` | Django models, migrations, APIs, permissions, workflow, report generation |
| `WebODM/plugins/bridge-inspection/` | Inspection UI, task links, source-photo review, map/3D hooks |
| `services/defect-inference/` | Model loading, image tiling, segmentation, inference manifests |
| `tests/fixtures/inspection/` | Small licensed image, projection, geometry, and IFC fixtures |
| `deployment/` | Production Compose configuration, backup/restore scripts, runbooks |

Confirm plugin loading/build behavior and installed Django compatibility in a small integration spike before adding migrations. Keep changes to upstream processing code minimal. Use supported APIs in application workflows; the current administrative demo scripts are not the production integration boundary.

The complete processing stack needs persistent compute and storage. If a separate public frontend is later hosted on Vercel, it must call an authenticated reachable backend; a deployed frontend cannot use this computer's `localhost:8000` URL.

## 6. Delivery phases and acceptance criteria

### Phase 0 — Reliable processing and evidence preservation

- [ ] Replace fixed project/task IDs, image counts, paths, and output directories in the demo scripts with validated parameters.
- [ ] Separate original evidence from reduced processing copies; retain file hashes, EXIF/orientation, capture dates, image dimensions, and attribution.
- [ ] Add a storage preflight that considers worker scratch space, finished assets, temporary packaging, and export copies. Configure a reserve and refuse new jobs when capacity is insufficient.
- [ ] Display original-photo count, submitted-photo count, aligned-photo count, quality settings, and the failed processing stage separately.
- [ ] Define and implement an evidence bundle for projection: original/undistorted camera intrinsics, distortion model, poses, image identifiers, reconstruction version, CRS, origins, and transforms. Existing `cameras.json` and `shots.geojson` are useful inputs, but verify they contain everything required before cleanup.
- [ ] Preserve validated outputs with checksums and a completion manifest. Publish “ready” only after required files are readable and complete.
- [ ] Add an explicit recovery action for missing node tasks: check available evidence, offer resubmission, and explain when recomputation is required. Do not promise checkpoint resume without testing engine support.
- [ ] Back up database records and media together; test restore on an isolated environment. Document named volumes and retention rules.
- [ ] Pin deployment image versions/digests and document the current WebODM/ODX service separately from the standalone ODM checkout.

Acceptance: a small survey completes; insufficient capacity blocks a new submission with a clear message; a controlled worker interruption leaves source evidence intact and permits recovery without duplicate inspection records; a backup restores a viewable task and its metadata.

### Phase 1 — Manual bridge inspection MVP

- [ ] Add bridge inventory fields: identifier, name, location, owner, structure type, and optional external asset reference.
- [ ] Add components such as deck, pier, abutment, bearing, and joint with stable IDs and optional model regions.
- [ ] Create an inspection record with survey date, inspector, linked reconstruction task, component coverage, and notes about missing views.
- [ ] Let the user define the bridge area during setup and save a map extent and 3D bookmark. Add **Open bridge**, **Map**, **3D**, **Photos**, and **Downloads** actions on the inspection page.
- [ ] Replace the separate viewer's Brighton-only asset assumptions with a selected asset manifest if that viewer remains part of the product. Otherwise use WebODM's existing viewer and retire the duplicate viewer deliberately.
- [ ] Add source-photo point, polyline, and polygon/mask annotation tools. Record defect type, affected component, notes, and evidence links.
- [ ] Define defect review states: draft, submitted, accepted, rejected, and superseded. Keep lifecycle repair status separate from review status.
- [ ] Support inspector and reviewer permissions using the existing project permission system; add read-only stakeholder access.
- [ ] Export a reviewed inspection PDF plus CSV/JSON findings, with bridge identity, annotated evidence, task/model version, units, uncertainty, and report status.

Acceptance: an inspector can open the bridge directly, record a manual finding on a source photograph, assign a component, submit it, obtain review, and export a report. A user outside the project cannot read its photos or findings. No AI or unvalidated submillimeter measurement is required for this release.

### Phase 2 — Defect segmentation with human review

- [ ] Agree on defect classes and labeling rules with inspectors; prioritize a narrow first class rather than claiming every defect type works.
- [ ] Prepare licensed, representative full-resolution imagery with masks and adjudicated labels. Include negative examples such as joints, shadows, stains, cables, and texture.
- [ ] Split evaluation by bridge/site and capture session; prevent adjacent frames or crops from leaking between training and evaluation.
- [ ] Establish a baseline segmentation model and version the weights, preprocessing, labels, and inference code together.
- [ ] Tile large images with overlap and merge masks consistently. Store transforms back to original image pixels, including EXIF rotation and crop/resizing effects.
- [ ] Store confidence and provenance for each AI suggestion; inspectors must accept, edit, or reject it before report approval.
- [ ] Add cancellable inference jobs, bounded retries, idempotent result ingestion, and resource limits. Avoid duplicate findings on repeated callbacks.
- [ ] Evaluate segmentation quality, crack continuity, false positives per image, and recall by defect size and capture condition. Agree numeric release targets before evaluation; do not invent success rates.

Acceptance: a held-out bridge dataset meets the agreed thresholds; model/version and source-image hashes reproduce the results; suggestions remain distinct from approved findings; poor-quality or unsupported images receive an explicit result instead of a fabricated measurement.

### Phase 3 — 3D defect projection and calibrated measurement

- [ ] Define image, camera, reconstruction, map, viewer, and BIM coordinate frames, including axis order, units, handedness, CRS, and vertical datum.
- [ ] Back-project source-image mask pixels using the correct intrinsics/distortion treatment and camera pose; intersect rays with the versioned mesh or an appropriate surface representation.
- [ ] Handle occlusion, grazing angles, missing geometry, and depth disagreement. Keep an unprojectable finding in the 2D evidence view with its reason.
- [ ] Associate observations across images with one reviewed defect when supported; preserve the independent observations and review merge decisions.
- [ ] Store model-version-specific surface anchors, such as mesh triangle and barycentric coordinates, plus a spatial position and transform provenance. Reprocessing must flag anchors for revalidation.
- [ ] Synchronize selection between original photograph, defect list, 3D surface, and component. Support an inspector placing an approximate manual 3D marker when automatic projection is unavailable, clearly labeled as manual.
- [ ] Implement calibrated surface length/area where supported; distinguish surface distance from straight-line distance. Derive crack-width estimates from suitable original-image evidence and local surface scale, not from a coarse orthophoto alone.
- [ ] Record measurement method, value, unit, uncertainty, calibration reference, and quality flags. Suppress width values below supported resolution.

Acceptance: known 2D points project to independently checked 3D targets within an agreed tolerance; occluded or missing-surface cases are rejected; unit/orientation tests pass; known dimensions are measured within validated limits; the 0.2 mm target remains gated until representative validation supports it.

### Phase 4 — IFC/BIM integration

- [ ] Select supported IFC schema versions and validate the import/export toolchain with representative customer files.
- [ ] Store the original IFC unchanged, including a content hash, model version, declared units, and coordinate metadata.
- [ ] Align reconstruction and BIM using reviewed control correspondences. Persist the transform, residuals, operator, and approval; do not silently assume shared origins or units.
- [ ] Associate components/findings with stable IFC `GlobalId` values and preserve associations per BIM version.
- [ ] Start with read-only IFC viewing and a defect-to-element association export. Add controlled writing of inspection properties or linked references only after agreement on the receiving BIM workflow.
- [ ] Export a new IFC revision or agreed issue/association package with original IDs retained and a change manifest. Handle missing/replaced elements on subsequent revisions.

Acceptance: the aligned IFC and reconstructed surface agree within defined tolerance; a reviewed finding resolves to the correct element; the exported file/package reopens in the receiving tool and retains expected IDs, units, and references. Full bidirectional synchronization is a later capability, not implied by one successful export.

### Phase 5 — Inspection history and production operations

- [ ] Group inspection sessions under stable bridge/component identities and keep each session's evidence immutable after approval.
- [ ] Track reviewed defect identity across inspections with registration quality and explicit confirmation of matches.
- [ ] Show previous/current evidence side by side. Calculate change only when measurement methods, scales, and registration are comparable; flag changes within uncertainty.
- [ ] Add assignments, due dates, repair status, and closure evidence with an append-only change history.
- [ ] Add organization boundaries if multiple organizations will share the service, including isolation tests for every evidence and download endpoint.
- [ ] Add private file delivery, HTTPS, managed secrets, monitoring, storage alerts, backup schedules, restore drills, and documented retention/export/deletion behavior.
- [ ] Make external AI uploads opt-in and visible; support offline/self-hosted inference when ownership requirements demand it. Review model/data licenses and existing repository licenses before distribution.

Acceptance: two inspections of one component remain traceable, reviewers can explain every approved change, unauthorized users cannot access another organization's evidence, and a restore drill recovers records plus associated files.

## 7. Proposed domain records

These are new records; the current project/task models do not provide this bridge-specific schema.

| Record | Minimum information |
| --- | --- |
| BridgeAsset | UUID, project relationship, name, location, owner reference, structure metadata |
| BridgeComponent | UUID, bridge, component type, external reference, optional model region/IFC association |
| Inspection | UUID, bridge, date, responsible users, task/model reference, coverage, review status |
| SourceEvidence | Immutable hash, original path/object key, EXIF/orientation, dimensions, capture metadata, permissions |
| ReconstructionVersion | Task UUID, engine/options, asset hashes, camera/CRS/transform bundle, quality summary |
| Defect | Stable UUID, inspection/component, type, reviewer-approved classification, workflow status |
| DefectObservation | Defect, evidence image, original-pixel mask/geometry, model suggestion confidence, author/model version |
| SurfaceAssociation | Observation, reconstruction version, spatial/surface anchor, transform, projection quality/status |
| Measurement | Defect, method, value/unit, uncertainty, evidence/calibration references, quality flags |
| ModelRun | Model/version, input manifest, preprocessing parameters, job state, result manifest, errors |
| BIMRevision / ElementAssociation | IFC hash/schema/units, registration transform, GlobalId, finding/component reference |
| ReviewEvent / ReportRevision | Actor, timestamp, before/after or decision, rationale, approved evidence/report snapshot |

Enforce referential integrity and project access on these records. Do not store the main inspection dataset as unstructured plugin settings or browser state. Keep long-lived defect identity separate from a particular image observation and mesh version.

## 8. API and job contracts

Plan a versioned `/api/inspection/v1/` namespace with resources for bridges, components, inspections, observations, findings, review events, inference jobs, reports, and BIM revisions. These endpoints do not exist yet.

- Link existing WebODM project/task IDs explicitly; check access server-side before reading or submitting work.
- Use asynchronous job IDs with state, stage, progress, error code, retryability, and timestamps. “Accepted” is not “complete.”
- Define idempotency for job creation and result ingestion, plus optimistic concurrency for edits and review decisions.
- Serve source files through authorized downloads or scoped expiring links where remote storage requires them.
- Publish versioned JSON schemas for masks, projection results, coordinate frames, and export manifests.
- Log evidence/model hashes and actor/job IDs without logging credentials or exposing private source URLs.

## 9. Verification plan

Focus automated tests on failures that can invalidate or lose inspection evidence:

| Test group | Required checks |
| --- | --- |
| Processing reliability | Capacity rejection, controlled worker interruption, missing-node recovery, checksum mismatch, partial output, successful rerun without duplicate records |
| Coordinate correctness | EXIF orientation, resize/crop reversal, lens distortion, known camera pose, CRS/axis/unit conversion, ray occlusion, missing mesh, model-origin offsets |
| Measurements | Known dimensions, uncertainty propagation, unsupported pixel scale, distinction between surface and straight-line length |
| Workflow and access | Unauthorized project/tenant access, role enforcement, concurrent edits, approved-record immutability, review history |
| AI validation | Held-out sites, negative examples, tiled-mask merging, model provenance, approved-versus-suggested findings |
| BIM | Unit/origin mismatch, transform residuals, stable GlobalIds, absent/replaced elements, receiving-tool round trip |
| Report and recovery | Correct photos/units/model versions, draft versus approved labeling, reproducible report snapshot, database-plus-media restore |

Use bounded test volumes or simulated capacity errors for storage tests; do not fill the user's system disk. Retain the Rivaz sample as a navigation/reconstruction smoke test. Obtain separate suitable close-range crack imagery and an IFC fixture for their respective acceptance tests.

## 10. Recommended implementation order

1. **First deliverable:** storage safeguards, parameterized bridge processing, direct bridge navigation, and evidence manifests.
2. **First inspection release:** bridge/component records, manual source-photo findings, reviewer workflow, and an inspection report.
3. **AI pilot:** one validated defect class with inspector review and reproducible model runs.
4. **Spatial release:** validated 2D-to-3D projection and measurements with uncertainty.
5. **BIM pilot:** reviewed IFC alignment and stable element associations, then controlled export.
6. **Lifecycle release:** repeated-inspection comparison, assignments, organization isolation, and tested operational recovery.

The immediate next feature should be the **bridge inspection workspace with manual findings**, preceded by the storage/evidence safeguards. This gives users a complete inspection workflow while the specialized datasets and accuracy validation needed for AI are developed.

## 11. Decisions needed during implementation

- Which defect classes and bridge components are in the first pilot?
- Does 0.2 mm mean detection, reliable width measurement, or both, and on which materials and capture conditions?
- What capture equipment, calibration references, and independent ground truth are available?
- Which IFC version and receiving BIM tool must the first integration support?
- Is the first release single-organization/self-hosted, or a service for several organizations?
- Who can approve findings, define severity, and sign off reports?

These decisions should be recorded before committing to validation targets or delivery dates. They do not block the initial reliability work or the manual inspection workspace.

## 12. MVP completion checklist

- [ ] A bridge opens directly in a useful map and 3D view.
- [ ] Original evidence survives processing, failure, export, and restore.
- [ ] An inspector records a component-linked finding on a source image.
- [ ] A reviewer accepts or rejects it with a recorded decision.
- [ ] Authorized users export a traceable inspection report and complete evidence package.
- [ ] Unsupported accuracy claims and measurements remain hidden or explicitly unvalidated.
- [ ] A repeated run or recovery action does not duplicate approved findings.
- [ ] Users can distinguish the completed inspection task from failed or superseded processing attempts.
