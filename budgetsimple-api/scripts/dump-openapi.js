'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const { build: buildApplication } = require('fastify-cli/helper')

async function main () {
  const appPath = path.join(__dirname, '..', 'app.js')
  const app = await buildApplication([appPath], {})

  try {
    await app.ready()

    let spec
    if (typeof app.swagger === 'function') {
      spec = app.swagger()
    } else {
      const res = await app.inject({ url: '/openapi.json' })
      spec = JSON.parse(res.payload)
    }
    const outPath = path.join(__dirname, '..', 'openapi.json')
    await fs.writeFile(outPath, JSON.stringify(spec, null, 2) + '\n', 'utf8')
    process.stdout.write(`Wrote ${outPath}\n`)
  } finally {
    await app.close()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
