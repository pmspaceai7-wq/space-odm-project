# pmspace.ai bridge workspace

Run `npm start` from this directory, then open http://127.0.0.1:8765.

This local interface uses the completed Rivaz files in `../outputs/rivaz-bridge/`. It includes a textured GLB viewer, orthophoto, labeled bridge crop, source photograph, downloads, and a browser-local observation notebook with JSON export. No external CDN is needed.

Upload and processing links open the existing WebODM dashboard at http://localhost:8000. That service must be running for those actions. The new interface is a separate local viewer, not a replacement of WebODM's authenticated dashboard.

Notes are personal browser-local records, not shared or approved inspection findings. AI detection, calibrated crack measurement, and BIM integration remain planned. The viewer server is intentionally bound to loopback and is not a production deployment.

The sample imagery is courtesy of Pix4D; see `../datasets/rivaz-bridge/SOURCE.md` for source and usage information.
