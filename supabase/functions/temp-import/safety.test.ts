import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const validation = source.slice(source.indexOf('// Validate the complete batch'), source.indexOf('const TIERS ='));
const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(validation);
const rules = new Function('z', js + '\nreturn { requestSchema, rowSchemas, allowedImageUrl, safeWarning, readLimited };')(z);
test('rejects batches over 200 rows', () => {
  assert.equal(rules.requestSchema.safeParse({token:'test-only',step:'events',rows:Array(201).fill({})}).success,false);
  assert.equal(rules.requestSchema.safeParse({token:'test-only',step:'events',rows:Array(200).fill({})}).success,true);
});
test('restricts download hosts and transport', () => {
  assert.equal(rules.allowedImageUrl('https://firebasestorage.googleapis.com/v0/b/example/o/image'),true);
  for (const url of ['http://firebasestorage.googleapis.com/image','https://127.0.0.1/image','https://storage.googleapis.com.evil.test/image','https://user:pass@storage.googleapis.com/image']) assert.equal(rules.allowedImageUrl(url),false);
});
test('validates rows before writing', () => {
  assert.equal(rules.rowSchemas.users.safeParse({id:'u',email:'invalid'}).success,false);
  assert.equal(rules.rowSchemas.events.safeParse({id:'e',title:'Run',date:'2026-11-05',time:'25:00'}).success,false);
  assert.equal(rules.rowSchemas.orders.safeParse({id:'o',orderNumber:'N',email:'a@example.test',lines:[{qty:-2}]}).success,false);
});
test('warnings do not include supplied URL details', () => {
  assert.equal(rules.safeWarning('MISSING FILE https://example.test/private-download'), 'MISSING FILE: inspect the source record locally; details withheld for privacy');
});
test('bounds streamed content', async () => {
  const stream = new ReadableStream({start(controller){controller.enqueue(new Uint8Array(5));controller.close();}});
  await assert.rejects(() => rules.readLimited(stream,4));
});
