'use strict'

module.exports = async function healthRoute (fastify) {
  fastify.get('/health', {
    schema: {
      summary: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: { ok: { type: 'boolean' } },
          required: ['ok']
        }
      }
    }
  }, async function healthHandler () {
    return { ok: true }
  })
}

