'use strict'

const fp = require('fastify-plugin')

/**
 * CORS plugin to allow frontend to call the API
 */
module.exports = fp(async function corsPlugin (fastify) {
  await fastify.register(require('@fastify/cors'), {
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Type']
  })
})



