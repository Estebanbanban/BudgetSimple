'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function swaggerPlugin (fastify) {
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Budgetsimple API',
        version: '0.1.0'
      }
    }
  })

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs'
  })

  fastify.get('/openapi.json', async function openapiRoute (_req, reply) {
    const spec = fastify.swagger()
    return reply.type('application/json').send(spec)
  })
})

