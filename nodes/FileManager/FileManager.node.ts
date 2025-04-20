import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
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
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Remove File', value: 'removeFile' },
          { name: 'Remove Folder', value: 'removeFolder' },
          { name: 'Copy File', value: 'copyFile' },
          { name: 'Copy Folder', value: 'copyFolder' },
          { name: 'Move File', value: 'moveFile' },
          { name: 'Move Folder', value: 'moveFolder' },
        ],
        default: 'removeFile',
        description: 'Operation to perform',
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
        description: 'Path to copy or move to',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'copyFile',
              'copyFolder',
              'moveFile',
              'moveFolder',
            ],
          },
        },
      },
      {
        displayName: 'Recursive',
        name: 'recursive',
        type: 'boolean',
        default: true,
        description: 'Delete folders recursively',
        displayOptions: {
          show: {
            operation: ['removeFolder'],
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
          case 'removeFile':
            await fs.unlink(sourcePath);
            break;
          case 'removeFolder': {
            const recursive = this.getNodeParameter('recursive', i) as boolean;
            if (recursive) {
              // Remove folder and its contents
              // @ts-ignore
              await fs.rm(sourcePath, { recursive: true, force: true });
            } else {
              await fs.rmdir(sourcePath);
            }
            break;
          }
          case 'copyFile': {
            const destinationPath = this.getNodeParameter(
              'destinationPath',
              i,
            ) as string;
            await fs.copyFile(sourcePath, destinationPath);
            break;
          }
          case 'copyFolder': {
            const destinationPath = this.getNodeParameter(
              'destinationPath',
              i,
            ) as string;
            await this.copyDir(sourcePath, destinationPath);
            break;
          }
          case 'moveFile': {
            const destinationPath = this.getNodeParameter(
              'destinationPath',
              i,
            ) as string;
            await fs.rename(sourcePath, destinationPath);
            break;
          }
          case 'moveFolder': {
            const destinationPath = this.getNodeParameter(
              'destinationPath',
              i,
            ) as string;
            await fs.rename(sourcePath, destinationPath);
            break;
          }
          default:
            throw new NodeOperationError(
              this.getNode(),
              `Unknown operation "${operation}"`,
            );
        }

        // Prepare output data
        items[i].json.operation = operation;
        items[i].json.sourcePath = sourcePath;
        items[i].json.success = true;
        if (
          ['copyFile', 'copyFolder', 'moveFile', 'moveFolder'].includes(
            operation,
          )
        ) {
          items[i].json.destinationPath = this.getNodeParameter(
            'destinationPath',
            i,
          ) as string;
        }
      } catch (error) {
        if (this.continueOnFail()) {
          items.push({
            json: this.getInputData(i)[0].json,
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

  private async copyDir(source: string, destination: string): Promise<void> {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath);
      } else if (entry.isSymbolicLink()) {
        const symlink = await fs.readlink(srcPath);
        await fs.symlink(symlink, destPath);
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}