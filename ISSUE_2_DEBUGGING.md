# ISSUE #2 Debugging - File Naming Not Working

## Problem

Files downloaded as `image-output` instead of `photo_web.png` (with proper suffix and extension).

## Added Debugging

Added console.log statements to the download endpoint:

```
[DOWNLOAD] Job ID: {id}
[DOWNLOAD] Input file: {filename}
[DOWNLOAD] Pipeline ID: {id}
[DOWNLOAD] Pipeline config found: {...}
[DOWNLOAD] Output files: [...]
[DOWNLOAD] Single file: format="{format}", suffix="{suffix}", properFileName="{name}"
```

## Next Steps

1. **Rebuild and redeploy** with logging enabled
2. **Test a download** and check the API logs
3. **Share the logs** with the `[DOWNLOAD]` lines
4. This will show us:
   - Is the pipeline ID correct?
   - Is the pipeline config being found?
   - What format/suffix are being extracted?
   - What properFileName is being generated?

## Deployment to LXC

```bash
cd ~/Developer/nd-image-pipeline
git add backend/src/routes/jobs.js
git commit -m "Add debugging for file naming issue #2"
git push origin main

# On LXC:
cd nd-image-pipeline
git pull origin main
docker compose down
docker compose up -d --build
docker compose logs api -f
```

Then test a download and share the logs that contain `[DOWNLOAD]` prefix.

