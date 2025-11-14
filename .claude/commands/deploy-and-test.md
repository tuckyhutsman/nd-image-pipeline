Deploy current changes to dev environment and show logs.

Steps:
1. Verify all changes are committed
```bash
   git status
```

2. Push to dev branch if needed
```bash
   git push origin dev
```

3. Deploy to dev server
```bash
   ./deploy.sh dev
```

4. Remind user to:
   - Test at http://10.0.4.139:3000
   - Close issue if successful
   - Run /promote-to-prod when ready