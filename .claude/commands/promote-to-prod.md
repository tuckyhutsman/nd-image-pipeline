Merge dev to main and deploy to production.

Steps:
1. Verify we're on dev branch
```bash
   git branch
```

2. Switch to main and merge
```bash
   git checkout main
   git merge dev
   git push origin main
```

3. Deploy to production
```bash
   ./deploy.sh prod
```

4. Switch back to dev branch for next work
```bash
   git checkout dev
```

5. Display production URL: http://10.0.4.39:3000

Note: Only use this after testing on dev!