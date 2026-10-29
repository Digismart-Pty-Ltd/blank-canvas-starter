import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const validation = source.slice(source.indexOf('// Validate each row'), source.indexOf('const TIERS ='));
const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(validation);
const rules = new Function('z', js + '\nreturn { requestSchema, rowSchemas, allowedImageUrl, safeWarning, readLimited, validateRows };')(z);
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
test('invalid rows are skipped while valid rows survive with field-only warnings', () => {
  const warnings: string[] = [];
  const rows = rules.validateRows('events', [
    {id:'bad',title:'Run',time:'25:00'},
    {id:'good',title:'Run',date:'2026-11-05'},
  ], warnings);
  assert.deepEqual(rows.map((row: any) => row.id), ['good']);
  assert.deepEqual(warnings, ['events: record bad skipped, invalid field time']);
});
test('distance accepts leading numbers and never invalidates an event', () => {
  for (const [input, expected] of [[5,5],['5',5],['5km',5],['5 km',5],[' 2.5 km',2.5],['',null],[null,null],['unknown',null],[{},null],[Infinity,null]]) {
    const result = rules.rowSchemas.events.safeParse({id:'e',title:'Run',distanceKm:input});
    assert.equal(result.success, true);
    assert.equal(result.data.distanceKm, expected);
  }
});
test('event display and orientation are normalized and null membersOnly is accepted', () => {
  const event = rules.rowSchemas.events.parse({id:'e',title:'Run',distanceDisplay:'5 km',imageOrientation:'portrait',membersOnly:null});
  assert.equal(event.distanceDisplay, '5 km');
  assert.equal(event.imageOrientation, 'portrait');
  assert.equal(Boolean(event.membersOnly), false);
  assert.equal(rules.rowSchemas.events.parse({id:'e',title:'Run',imageOrientation:'landscape'}).imageOrientation,'landscape');
  assert.equal(rules.rowSchemas.events.parse({id:'e',title:'Run',imageOrientation:'square'}).imageOrientation,null);
});
test('unsupported event images become null with an ID-only warning', () => {
  const warnings: string[] = [];
  const rows = rules.validateRows('events',[{id:'e',title:'Run',image:'https://private.example/secret'}],warnings);
  assert.equal(rows.length,1);
  assert.equal(rows[0].image,null);
  assert.deepEqual(warnings,['events: record e image source not allowed, image_url set to null']);
});
test('malformed IDs never expose URLs or injected warning text', () => {
  const warnings: string[] = [];
  rules.validateRows('events',[{id:'https://private.example/secret',title:42}],warnings);
  assert.deepEqual(warnings,['events: record row-1 skipped, invalid field title']);
});
test('number fields convert numeric strings without losing their bounds', () => {
  assert.equal(rules.rowSchemas.users.parse({id:'u',email:'a@example.test',rewardsPending:'12'}).rewardsPending,12);
  const advert = rules.rowSchemas.advertisements.parse({id:'a',orderNumber:'A',businessName:'Shop',price:'25.50',months:'3'});
  assert.equal(advert.price,25.5);
  assert.equal(advert.months,3);
  assert.equal(rules.rowSchemas.orders.parse({id:'o',orderNumber:'O',email:'a@example.test',lines:[{qty:'2'}]}).lines[0].qty,2);
  for (const qty of ['0','-1','10001','1.5','not a number']) {
    assert.equal(rules.rowSchemas.orders.safeParse({id:'o',orderNumber:'O',email:'a@example.test',lines:[{qty}]}).success,false);
  }
});
test('all optional fields accept null including booleans and arrays', () => {
  for (const step of ['users','profiles','events','eventRegistrations','notifications','advertisements','orders']) {
    const shape = rules.rowSchemas[step].shape;
    const row: Record<string, unknown> = {id:'r',email:'a@example.test',title:'Run',eventId:'e',orderNumber:'O',businessName:'Shop'};
    for (const [key, schema] of Object.entries(shape)) {
      if ((schema as any).isOptional()) row[key] = null;
    }
    assert.equal(rules.rowSchemas[step].safeParse(row).success,true,step);
  }
  assert.equal(rules.rowSchemas.orders.safeParse({id:'o',orderNumber:'O',email:'a@example.test',lines:[{qty:null}]}).success,true);
});
test('20 MiB request and existing download constraints stay hard limits', async () => {
  const maximum = 20 * 1024 * 1024;
  const stream = (size: number) => new ReadableStream({start(c){c.enqueue(new Uint8Array(size));c.close();}});
  assert.equal((await rules.readLimited(stream(maximum), maximum)).length,maximum);
  await assert.rejects(() => rules.readLimited(stream(maximum + 1), maximum));
  assert.ok(source.includes('readLimited(req.body, 20 * 1024 * 1024)'));
  assert.ok(source.includes('redirect: "error"'));
  assert.ok(source.includes('bucket === "avatars" ? 2 * 1024 * 1024 : 10 * 1024 * 1024'));
});
