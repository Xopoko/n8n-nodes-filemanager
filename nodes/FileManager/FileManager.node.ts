import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { promises as fs } from 'fs';
import * as path from 'path';

export class FileManager implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'File Manager',
    name: 'fileManager',
    icon: 'fa:folder-open',
    group: ['transform'],
    version: 1,
    description: 'Manage files and folders on disk',
    defaults: { name: 'File Manager' },
    // eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
    inputs: [NodeConnectionType.Main],
    // eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
    outputs: [NodeConnectionType.Main],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Copy', value: 'copy' },
          { name: 'Create', value: 'create' },
          { name: 'Move', value: 'move' },
          { name: 'Remove', value: 'remove' },
          { name: 'Rename', value: 'rename' },
        ],
        default: 'remove',
      },
      {
        displayName: 'Source Path',
        name: 'sourcePath',
        type: 'string',
        default: '',
        placeholder: '/path/to/source',
        description: 'Path of the source file or folder',
        required: true,
      },
      {
        displayName: 'Destination Path',
        name: 'destinationPath',
        type: 'string',
        default: '',
        placeholder: '/path/to/destination',
        description: 'Path to copy, move, or rename to',
        required: true,
        displayOptions: {
          show: {
            operation: ['copy', 'move', 'rename'],
          },
        },
      },
      {
        displayName: 'Recursive',
        name: 'recursive',
        type: 'boolean',
        default: true,
        description: 'Whether to delete folders recursively',
        displayOptions: {
          show: {
            operation: ['remove'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const sourcePath = this.getNodeParameter('sourcePath', i) as string;

        switch (operation) {
          case 'remove': {
            // Determine if source is a directory
            let isDir = false;
            try {
              const stats = await fs.lstat(sourcePath);
              isDir = stats.isDirectory();
            } catch {
              isDir = false;
            }

            if (isDir) {
              const recursive = this.getNodeParameter('recursive', i) as boolean;
              if (recursive) {
                // @ts-ignore
                await fs.rm(sourcePath, { recursive: true, force: true });
              } else {
                await fs.rmdir(sourcePath);
              }
            } else {
              await fs.unlink(sourcePath);
            }
            break;
          }

          case 'copy': {
            const destinationPath = this.getNodeParameter('destinationPath', i) as string;
            // Determine if source is a directory
            let isDir = false;
            try {
              const stats = await fs.lstat(sourcePath);
              isDir = stats.isDirectory();
            } catch {
              isDir = false;
            }

            if (isDir) {
              const copyDirectory = async (src: string, dest: string): Promise<void> => {
                await fs.mkdir(dest, { recursive: true });
                const entries = await fs.readdir(src, { withFileTypes: true });
                for (const entry of entries) {
                  const srcPath = path.join(src, entry.name);
                  const destPath = path.join(dest, entry.name);
                  if (entry.isDirectory()) {
                    await copyDirectory(srcPath, destPath);
                  } else if (entry.isSymbolicLink()) {
                    const symlink = await fs.readlink(srcPath);
                    await fs.symlink(symlink, destPath);
                  } else {
                    await fs.copyFile(srcPath, destPath);
                  }
                }
              };
              await copyDirectory(sourcePath, destinationPath);
            } else {
              await fs.copyFile(sourcePath, destinationPath);
            }
            break;
          }

          case 'move': {
            const destinationPath = this.getNodeParameter('destinationPath', i) as string;
            await fs.rename(sourcePath, destinationPath);
            break;
          }

          case 'create': {
            const ext = path.extname(sourcePath);
            if (ext) {
              await fs.writeFile(sourcePath, '', 'utf8');
            } else {
              await fs.mkdir(sourcePath, { recursive: true });
            }
            break;
          }

          case 'rename': {
            const destinationPath = this.getNodeParameter('destinationPath', i) as string;
            await fs.rename(sourcePath, destinationPath);
            break;
          }

          default:
            throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`);
        }

        // Prepare output data
        items[i].json.operation = operation;
        items[i].json.sourcePath = sourcePath;
        items[i].json.success = true;
        if (['copy', 'move', 'rename'].includes(operation)) {
          items[i].json.destinationPath = this.getNodeParameter('destinationPath', i) as string;
        }
      } catch (error) {
        if (this.continueOnFail()) {
          items.push({
            json: items[i].json,
            error,
            pairedItem: i,
          });
          continue;
        }
        if (error instanceof NodeOperationError) {
          throw error;
        }
        throw new NodeOperationError(
          this.getNode(),
          error as Error,
          { itemIndex: i },
        );
      }
    }
    return [items];
  }

}
