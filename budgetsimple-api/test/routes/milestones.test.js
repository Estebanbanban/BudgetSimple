"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { build } = require("../helper");
const { MockSupabase } = require("../mocks/mock-supabase");

const withApp = async (t) => {
  const app = await build(t);
  app.supabase = new MockSupabase();
  return app;
};

test("POST /api/milestones rejects invalid payloads", async (t) => {
  const app = await withApp(t);

  const missingLabel = await app.inject({
    method: "POST",
    url: "/api/milestones?userId=user-1",
    payload: { targetValue: 1000 },
  });
  assert.strictEqual(missingLabel.statusCode, 400);

  const negativeTarget = await app.inject({
    method: "POST",
    url: "/api/milestones?userId=user-1",
    payload: { label: "Bad", targetValue: -1 },
  });
  assert.strictEqual(negativeTarget.statusCode, 400);
});

test("milestone CRUD honors user scoping and ordering", async (t) => {
  const app = await withApp(t);

  const createdTwo = await app.inject({
    method: "POST",
    url: "/api/milestones?userId=user-1",
    headers: { "content-type": "application/json" },
    payload: { label: "Two", targetValue: 2000, displayOrder: 1 },
  });
  assert.strictEqual(createdTwo.statusCode, 200, createdTwo.payload);

  const createdOne = await app.inject({
    method: "POST",
    url: "/api/milestones?userId=user-1",
    headers: { "content-type": "application/json" },
    payload: { label: "One", targetValue: 1000, displayOrder: 0 },
  });
  assert.strictEqual(createdOne.statusCode, 200, createdOne.payload);

  const otherUser = await app.inject({
    method: "POST",
    url: "/api/milestones?userId=user-2",
    headers: { "content-type": "application/json" },
    payload: { label: "Other", targetValue: 500 },
  });
  assert.strictEqual(otherUser.statusCode, 200, otherUser.payload);

  const list = await app.inject({ method: "GET", url: "/api/milestones?userId=user-1" });
  assert.strictEqual(list.statusCode, 200);
  const { milestones } = JSON.parse(list.payload);
  assert.deepStrictEqual(
    milestones.map((m) => m.label),
    ["One", "Two"]
  );

  const targetId = milestones[0].id;
  const updateRes = await app.inject({
    method: "PATCH",
    url: `/api/milestones/${targetId}?userId=user-1`,
    payload: { displayOrder: 0, label: "One updated" },
  });
  assert.strictEqual(updateRes.statusCode, 200);
  const updated = JSON.parse(updateRes.payload).milestone;
  assert.strictEqual(updated.label, "One updated");
  assert.strictEqual(updated.display_order, 0);
});

test("DELETE /api/milestones prevents removing another user's item", async (t) => {
  const app = await withApp(t);
  const created = await app.inject({
    method: "POST",
    url: "/api/milestones?userId=user-2",
    headers: { "content-type": "application/json" },
    payload: { label: "Keep", targetValue: 1 },
  });
  const milestoneId = JSON.parse(created.payload).milestone.id;

  const forbidden = await app.inject({
    method: "DELETE",
    url: `/api/milestones/${milestoneId}?userId=user-1`,
  });
  assert.strictEqual(forbidden.statusCode, 404);

  const allowed = await app.inject({
    method: "DELETE",
    url: `/api/milestones/${milestoneId}?userId=user-2`,
  });
  assert.strictEqual(allowed.statusCode, 200);
});

test("PATCH /api/milestones/reorder updates display order", async (t) => {
  const app = await withApp(t);
  const first = await app.inject({
    method: "POST",
    url: "/api/milestones?userId=user-1",
    headers: { "content-type": "application/json" },
    payload: { label: "First", targetValue: 10, displayOrder: 0 },
  });
  const second = await app.inject({
    method: "POST",
    url: "/api/milestones?userId=user-1",
    headers: { "content-type": "application/json" },
    payload: { label: "Second", targetValue: 20, displayOrder: 1 },
  });

  const ids = [JSON.parse(second.payload).milestone.id, JSON.parse(first.payload).milestone.id];
  const reorderRes = await app.inject({
    method: "PATCH",
    url: "/api/milestones/reorder?userId=user-1",
    payload: { milestoneIds: ids },
  });
  assert.strictEqual(reorderRes.statusCode, 200);

  const list = await app.inject({ method: "GET", url: "/api/milestones?userId=user-1" });
  const { milestones } = JSON.parse(list.payload);
  assert.deepStrictEqual(
    milestones.map((m) => m.id),
    ids
  );
});
