import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { promises as fs, createWriteStream, createReadStream } from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { createGzip, createGunzip } from 'zlib';

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
          { name: 'Append', value: 'append' },
          { name: 'Change Permissions', value: 'chmod' },
          { name: 'Compress', value: 'compress' },
          { name: 'Copy', value: 'copy' },
          { name: 'Create', value: 'create' },
          { name: 'Exists', value: 'exists' },
          { name: 'Extract', value: 'extract' },
          { name: 'List', value: 'list' },
          { name: 'Metadata', value: 'metadata' },
          { name: 'Move', value: 'move' },
          { name: 'Read', value: 'read' },
          { name: 'Remove', value: 'remove' },
          { name: 'Rename', value: 'rename' },
          { name: 'Write', value: 'write' },
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
        description: 'Target path for copy, move, rename, compress, and extract operations',
        required: true,
        displayOptions: {
          show: {
            operation: ['compress', 'copy', 'extract', 'move', 'rename'],
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
      {
        displayName: 'Target Path',
        name: 'targetPath',
        type: 'string',
        default: '',
        placeholder: '/path/to/target',
        description: 'Path of the file or folder to operate on',
        required: true,
        displayOptions: {
          show: {
            operation: ['read', 'write', 'append', 'list', 'exists', 'metadata', 'chmod'],
          },
        },
      },
      {
        displayName: 'Data',
        name: 'data',
        type: 'string',
        default: '',
        description: 'Content to write or append to the file',
        displayOptions: {
          show: {
            operation: ['write', 'append'],
          },
        },
      },
      {
        displayName: 'Encoding',
        name: 'encoding',
        type: 'string',
        default: 'utf8',
        description: 'File encoding',
        displayOptions: {
          show: {
            operation: ['read', 'write', 'append'],
          },
        },
      },
      {
        displayName: 'Mode',
        name: 'mode',
        type: 'number',
        default: 0o644,
        description: 'Unix permission bits, e.g. 644',
        displayOptions: {
          show: {
            operation: ['chmod'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const inputItems = this.getInputData();
    const returnItems: INodeExecutionData[] = [];
    for (let i = 0; i < inputItems.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;

        switch (operation) {
          case 'remove': {
            const sourcePath = this.getNodeParameter('sourcePath', i) as string;
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
            const sourcePath = this.getNodeParameter('sourcePath', i) as string;
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
            const sourcePath = this.getNodeParameter('sourcePath', i) as string;
            const destinationPath = this.getNodeParameter('destinationPath', i) as string;
            await fs.rename(sourcePath, destinationPath);
            break;
          }

          case 'compress': {
            const sourcePath = this.getNodeParameter('sourcePath', i) as string;
            const destinationPath = this.getNodeParameter('destinationPath', i) as string;
            await new Promise<void>((resolve, reject) => {
              const tar = spawn('tar', ['-czf', destinationPath, path.basename(sourcePath)], {
                cwd: path.dirname(sourcePath),
              });
              tar.on('error', reject);
              tar.on('close', (code) => {
                if (code !== 0) reject(new Error(`tar exited with code ${code}`));
                else resolve();
              });
            });
            break;
          }

          case 'extract': {
            const sourcePath = this.getNodeParameter('sourcePath', i) as string;
            const destinationPath = this.getNodeParameter('destinationPath', i) as string;
            await fs.mkdir(destinationPath, { recursive: true });
            await new Promise<void>((resolve, reject) => {
              const input = createReadStream(sourcePath);
              const gunzip = createGunzip();
              const tar = spawn('tar', ['-xf', '-', '-C', destinationPath]);
              tar.on('error', reject);
              tar.on('close', (code) => {
                if (code !== 0) reject(new Error(`tar exited with code ${code}`));
                else resolve();
              });
              input.pipe(gunzip).pipe(tar.stdin).on('error', reject);
            });
            break;
          }

          case 'create': {
            const sourcePath = this.getNodeParameter('sourcePath', i) as string;
            const ext = path.extname(sourcePath);
            if (ext) {
              await fs.writeFile(sourcePath, '', 'utf8');
            } else {
              await fs.mkdir(sourcePath, { recursive: true });
            }
            break;
          }

          case 'rename': {
            const sourcePath = this.getNodeParameter('sourcePath', i) as string;
            const destinationPath = this.getNodeParameter('destinationPath', i) as string;
            await fs.rename(sourcePath, destinationPath);
            break;
          }

          case 'read': {
            const targetPath = this.getNodeParameter('targetPath', i) as string;
            const encoding = this.getNodeParameter('encoding', i) as BufferEncoding;
            const data = await fs.readFile(targetPath, { encoding });
            inputItems[i].json.data = data;
            inputItems[i].json.targetPath = targetPath;
            break;
          }

          case 'write': {
            const targetPath = this.getNodeParameter('targetPath', i) as string;
            const content = this.getNodeParameter('data', i) as string;
            const encoding = this.getNodeParameter('encoding', i) as BufferEncoding;
            await fs.writeFile(targetPath, content, { encoding });
            inputItems[i].json.targetPath = targetPath;
            break;
          }

          case 'append': {
            const targetPath = this.getNodeParameter('targetPath', i) as string;
            const content = this.getNodeParameter('data', i) as string;
            const encoding = this.getNodeParameter('encoding', i) as BufferEncoding;
            await fs.appendFile(targetPath, content, { encoding });
            inputItems[i].json.targetPath = targetPath;
            break;
          }

          case 'chmod': {
            const targetPath = this.getNodeParameter('targetPath', i) as string;
            const mode = this.getNodeParameter('mode', i) as number;
            await fs.chmod(targetPath, mode);
            inputItems[i].json.targetPath = targetPath;
            inputItems[i].json.mode = mode;
            break;
          }

          case 'list': {
            const targetPath = this.getNodeParameter('targetPath', i) as string;
            const files = await fs.readdir(targetPath);
            inputItems[i].json.list = files;
            inputItems[i].json.targetPath = targetPath;
            break;
          }

          case 'exists': {
            const targetPath = this.getNodeParameter('targetPath', i) as string;
            let exists = true;
            try {
              await fs.access(targetPath);
            } catch {
              exists = false;
            }
            inputItems[i].json.exists = exists;
            inputItems[i].json.targetPath = targetPath;
            break;
          }

          case 'metadata': {
            const targetPath = this.getNodeParameter('targetPath', i) as string;
            const stats = await fs.lstat(targetPath);
            inputItems[i].json.size = stats.size;
            inputItems[i].json.mtime = stats.mtime;
            inputItems[i].json.atime = stats.atime;
            inputItems[i].json.isDirectory = stats.isDirectory();
            inputItems[i].json.isFile = stats.isFile();
            inputItems[i].json.targetPath = targetPath;
            break;
          }

          default:
            throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`);
        }

        // Prepare output data
        inputItems[i].json.operation = operation;
        inputItems[i].json.success = true;
        if (['compress', 'copy', 'extract', 'move', 'rename', 'remove', 'create'].includes(operation)) {
          inputItems[i].json.sourcePath = this.getNodeParameter('sourcePath', i) as string;
        }
        if (['compress', 'copy', 'extract', 'move', 'rename'].includes(operation)) {
          inputItems[i].json.destinationPath = this.getNodeParameter('destinationPath', i) as string;
        }
        if (['read', 'write', 'append', 'list', 'exists', 'metadata', 'chmod'].includes(operation)) {
          inputItems[i].json.targetPath = this.getNodeParameter('targetPath', i) as string;
        }
        returnItems.push(inputItems[i]);
      } catch (error) {
        if (this.continueOnFail()) {
          returnItems.push({
            json: inputItems[i].json,
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
    return [returnItems];
  }

}
