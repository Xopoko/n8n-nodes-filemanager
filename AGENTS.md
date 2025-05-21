# AI Agent Guidelines

This repository contains a **File Manager** community node for n8n. It exposes operations for creating, copying, moving, removing and renaming files or directories. The node schema lives in [`nodes/FileManager/FileManager.node.ts`](nodes/FileManager/FileManager.node.ts).

## Development Instructions

- Always run `npm test` before committing changes. This command builds the project and executes the unit and lint tests.
- The environment does **not** have network access after setup. Avoid commands that fetch packages such as `npm install`.
- Commands for PHP or Swift are unavailable; do not run `php`, `swift build` or their respective test commands.
- Update this `AGENTS.md` file whenever repository guidelines change so agents always have the latest instructions.
- When adding option arrays with five or more entries, **alphabetize them by `name`**. The `n8n-nodes-base/node-param-options-type-unsorted-items` rule will fail the lint step otherwise. Running `npm run lint -- --fix` can reorder them automatically.

## Using the File Manager Node with AI

The node is marked `usableAsTool: true` so an AI agent can call its operations directly from natural language prompts. Typical actions include:

- Creating or deleting files and folders
- Copying or moving items on disk
- Renaming files or directories

Be explicit about the desired operation and target path when prompting an agent.

### Prompt Examples

```
• "Create a directory `/tmp/logs` if it does not exist."
• "Copy `report.csv` to the `archive` folder."
• "Delete the temporary folder after processing." 
```

### Design Considerations

- Test prompts with non-destructive actions first to confirm behavior.
- Provide clear instructions and limits in system messages (e.g. "never delete unless told explicitly").
- Keep file paths short when possible to conserve tokens.

Following these guidelines will help agents work safely with the File Manager node.
