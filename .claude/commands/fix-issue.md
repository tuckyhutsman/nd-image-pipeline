Please fix the GitHub issue provided as $ARGUMENTS.

Follow these steps:

1. **View the issue details**
```bash
   gh issue view $ARGUMENTS
```

2. **Understand the problem**
   - Read the issue description carefully
   - Identify what needs to be changed

3. **Find relevant files**
   - Search the codebase for files related to the issue
   - Use grep or file search to locate components

4. **Implement the fix**
   - Make necessary code changes
   - Keep changes focused on this specific issue
   - Follow existing code patterns

5. **Test the changes**
   - Verify the fix works
   - Check for any side effects

6. **Commit the changes**
   - Create a clear commit message
   - Reference the issue number (e.g., "Fix: resolve issue #123")
   - Commit to the dev branch

7. **Push to GitHub**
```bash
   git push origin dev
```

## Important Notes:
- Always work on the dev branch
- Keep changes atomic (one issue = one fix)
- Test before pushing
- Don't close the issue yet - wait until deployed and verified
