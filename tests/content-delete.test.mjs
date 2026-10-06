import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { prisma } from '../lib/db.ts';
import { DELETE } from '../app/api/contents/[id]/route.ts';
import { proxy } from '../proxy.ts';

const id = 'a05443ec-5642-47aa-8639-fde0f0c0ed5b';
const originalTransaction = prisma.$transaction;
afterEach(() => { prisma.$transaction = originalTransaction; mock.restoreAll(); });
const remove = (value = id) => DELETE(
  new Request(`http://localhost/api/contents/${value}`, { method: 'DELETE' }),
  { params: Promise.resolve({ id: value }) },
);

function database(statuses = [], exists = true) {
  let query = 0;
  const tx = {
    $queryRaw: async () => ++query === 1 ? (exists ? [{ id }] : []) : statuses.map(status => ({ status })),
    websiteProductPublication: { updateMany: mock.fn(async () => ({ count: 1 })) },
    contentItem: { delete: mock.fn(async () => ({ id })) },
  };
  prisma.$transaction = mock.fn(async fn => fn(tx));
  return tx;
}

test('delete endpoint requires a logged-in session', async () => {
  const response = await proxy(new NextRequest(`http://localhost/api/contents/${id}`, { method: 'DELETE' }));
  assert.equal(response.status, 401);
});

test('invalid content ID is rejected before accessing the database', async () => {
  database();
  assert.equal((await remove('not-a-uuid')).status, 400);
  assert.equal(prisma.$transaction.mock.callCount(), 0);
});

test('missing content returns 404 without changing catalog history', async () => {
  const tx = database([], false);
  assert.equal((await remove()).status, 404);
  assert.equal(tx.websiteProductPublication.updateMany.mock.callCount(), 0);
  assert.equal(tx.contentItem.delete.mock.callCount(), 0);
});

for (const status of ['scheduled', 'publishing']) {
  test(`one ${status} post prevents deleting the entire content`, async () => {
    const tx = database(['draft', status, 'published']);
    assert.equal((await remove()).status, 409);
    assert.equal(tx.websiteProductPublication.updateMany.mock.callCount(), 0);
    assert.equal(tx.contentItem.delete.mock.callCount(), 0);
  });
}

test('deletion detaches catalog history and removes draft content in one transaction without platform requests', async () => {
  const tx = database(['draft', 'draft']);
  const fetch = mock.method(globalThis, 'fetch', async () => { throw Error('No external requests expected'); });
  const response = await remove();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, id });
  assert.deepEqual(tx.websiteProductPublication.updateMany.mock.calls[0].arguments, [{ where: { contentId: id }, data: { contentId: null } }]);
  assert.deepEqual(tx.contentItem.delete.mock.calls[0].arguments, [{ where: { id } }]);
  assert.equal(prisma.$transaction.mock.callCount(), 1);
  assert.equal(fetch.mock.callCount(), 0);
});

test('database failure returns an error rather than reporting a successful deletion', async () => {
  prisma.$transaction = async () => { throw Error('Database unavailable'); };
  mock.method(console, 'error', () => {});
  const response = await remove();
  assert.equal(response.status, 500);
  assert.equal((await response.json()).success, false);
});
