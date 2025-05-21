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

test('write file', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'write.txt');
  await runNode([{ operation: 'write', targetPath: file, data: 'hello', encoding: 'utf8' }]);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), 'hello');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('append file', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'append.txt');
  fs.writeFileSync(file, 'start');
  await runNode([{ operation: 'append', targetPath: file, data: ' end', encoding: 'utf8' }]);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), 'start end');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('read file', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'read.txt');
  fs.writeFileSync(file, 'data');
  const [[result]] = await runNode([{ operation: 'read', targetPath: file, encoding: 'utf8' }]);
  assert.strictEqual(result.json.data, 'data');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('list directory', async () => {
  const dir = tmpDir();
  const a = path.join(dir, 'a.txt');
  const b = path.join(dir, 'b.txt');
  fs.writeFileSync(a, '1');
  fs.writeFileSync(b, '2');
  const [[result]] = await runNode([{ operation: 'list', targetPath: dir }]);
  assert.deepStrictEqual(result.json.list.sort(), ['a.txt', 'b.txt']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('exists path', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'exist.txt');
  fs.writeFileSync(file, 'ok');
  const [[res1]] = await runNode([{ operation: 'exists', targetPath: file }]);
  assert.strictEqual(res1.json.exists, true);
  const [[res2]] = await runNode([{ operation: 'exists', targetPath: path.join(dir, 'no.txt') }]);
  assert.strictEqual(res2.json.exists, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('metadata path', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'meta.txt');
  fs.writeFileSync(file, 'hello');
  const [[res]] = await runNode([{ operation: 'metadata', targetPath: file }]);
  assert.strictEqual(res.json.size, 5);
  assert.strictEqual(res.json.isFile, true);
  assert.strictEqual(res.json.isDirectory, false);
  assert.ok(res.json.mtime);
  assert.ok(res.json.atime);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('chmod file', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'chmod.txt');
  fs.writeFileSync(file, 'perm');
  await runNode([{ operation: 'chmod', targetPath: file, mode: 0o600 }]);
  const mode = fs.statSync(file).mode & 0o777;
  assert.strictEqual(mode, 0o600);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('compress and extract directory', async () => {
  const dir = tmpDir();
  const srcDir = path.join(dir, 'src');
  const dstDir = path.join(dir, 'dst');
  const archive = path.join(dir, 'archive.tar.gz');
  fs.mkdirSync(srcDir);
  const file = path.join(srcDir, 'hello.txt');
  fs.writeFileSync(file, 'hi');

  await runNode([{ operation: 'compress', sourcePath: srcDir, destinationPath: archive }]);
  assert.ok(fs.existsSync(archive));

  await runNode([{ operation: 'extract', sourcePath: archive, destinationPath: dstDir }]);
  const extracted = path.join(dstDir, 'src', 'hello.txt');
  assert.strictEqual(fs.readFileSync(extracted, 'utf8'), 'hi');
  fs.rmSync(dir, { recursive: true, force: true });
});
