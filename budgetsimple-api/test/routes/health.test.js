'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { build } = require('../helper')

test('health route', async (t) => {
  const app = await build(t)

  const res = await app.inject({ url: '/health' })
  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.payload), { ok: true })
})

test('openapi is exposed', async (t) => {
  const app = await build(t)

  const res = await app.inject({ url: '/openapi.json' })
  assert.strictEqual(res.statusCode, 200)
  const spec = JSON.parse(res.payload)
  assert.ok(spec.openapi)
  assert.ok(spec.info)
})

