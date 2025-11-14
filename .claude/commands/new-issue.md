Create a new GitHub issue with the title and body provided.

Usage: /new-issue <title> | <body>

Steps:
1. Parse the title and body from $ARGUMENTS (split by |)
2. Create the issue using gh CLI
3. Display the issue number and URL
4. Remind the user they can now use /fix-issue with that number

Example:
/new-issue Add dark mode toggle | Implement a dark mode toggle button in the header that persists user preference