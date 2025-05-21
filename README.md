[![npm version](https://img.shields.io/npm/v/n8n-nodes-filemanager.svg)](https://www.npmjs.com/package/n8n-nodes-filemanager)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-filemanager.svg)](https://www.npmjs.com/package/n8n-nodes-filemanager)
[![License](https://img.shields.io/npm/l/n8n-nodes-filemanager.svg)](https://github.com/xopoko/n8n-nodes-filemanager/blob/main/LICENSE.md)

# n8n-nodes-filemanager

A community node for [n8n](https://n8n.io/) to manage files and folders on disk. Supports generic operations: create, copy, move, remove, and rename files and directories.

## Installation

Install via npm:
```bash
npm install n8n-nodes-filemanager
```

Restart your n8n instance to load the new node.

## Requirements

- n8n >= 1.82.0
- Node.js >= 18.10

## File Manager Node

The File Manager node provides the following operations:

- **create** — Creates a file or directory. If the path has an extension, a file is created; otherwise, a directory is created.
- **copy** — Copies a file or directory to a new location.
- **move** — Moves (renames) a file or directory to a new location.
- **remove** — Deletes a file or directory. Supports recursive deletion of directories.
- **rename** — Alias for move; renames a file or directory.
- **read** — Reads the contents of a file.
- **write** — Writes data to a file, replacing the existing contents.
- **append** — Appends data to the end of a file.
- **list** — Lists the entries of a directory.
- **exists** — Checks if a path exists.

### Node Parameters

| Parameter        | Description                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| Operation        | The action to perform: `create`, `copy`, `move`, `remove`, `rename`, `read`, `write`, `append`, `list`, `exists`. |
| Source Path      | Path to the file or directory to operate on. |
| Destination Path | Target path for `copy`, `move`, and `rename` operations. |
| Recursive        | Whether to delete directories recursively for `remove` operation (default: `true`). |
| Target Path      | Path for `read`, `write`, `append`, `list`, and `exists` operations. |
| Data             | Content to use for `write` and `append` operations. |
| Encoding         | File encoding for `read`, `write`, and `append` (default: `utf8`). |

### Example Usage

1. Add the File Manager node to your workflow.
2. Set **Operation** to `copy`.
3. Enter `/tmp/example.txt` as **Source Path**.
4. Enter `/tmp/example-copy.txt` as **Destination Path**.
5. Execute the workflow to copy the file.

## Version History

- **v0.2.1** — Patch release: version bump.
- **v0.2.0** — Breaking change: generic operations; auto-detect file or directory. Removed separate file/folder parameters.
- **v0.1.0** — Initial release with separate file and folder operations.

## Contributing

Contributions welcome! Please open issues and submit pull requests on [GitHub](https://github.com/xopoko/n8n-nodes-filemanager).

## License

MIT © horoko
