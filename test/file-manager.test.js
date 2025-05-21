import test from "node:test";
import { FileManager } from '../dist/nodes/FileManager/FileManager.node.js';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function runNode(paramsArray, items = [{ json: {} }]) {
  const node = new FileManager();
  const context = {
    getInputData() { return items; },
    getNodeParameter(name, index) { return paramsArray[index][name]; },
    continueOnFail() { return false; },
    getNode() { return { name: 'fileManager' }; },
  };
  return node.execute.call(context);
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fm-'));
}

test('create file', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'test.txt');
  await runNode([{ operation: 'create', sourcePath: file }]);
  assert.ok(fs.existsSync(file));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('copy file', async () => {
  const dir = tmpDir();
  const src = path.join(dir, 'src.txt');
  const dst = path.join(dir, 'dst.txt');
  fs.writeFileSync(src, 'hello');
  await runNode([{ operation: 'copy', sourcePath: src, destinationPath: dst }]);
  assert.ok(fs.existsSync(dst));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('remove file', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'remove.txt');
  fs.writeFileSync(file, 'bye');
  await runNode([{ operation: 'remove', sourcePath: file }]);
  assert.ok(!fs.existsSync(file));
  fs.rmSync(dir, { recursive: true, force: true });
});
