# VS Code Kick Assembler Studio (with fixed debugging)

This is a fork of [VS Code Kick Assembler Studio](https://github.com/sanmont/vscode-kickass-studio), with the debugging fixed.

See [reported issue](https://github.com/sanmont/vscode-kickass-studio/issues/39).

Note that the fix is actually a workaround; it will open a phony file instead of crashing, but it still allows comfortably following up the debug session.

The package manifest has also been fixed; it was locked, seemingly accidentally, to a specific version of VSC.
