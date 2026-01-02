'use strict'

// PARKED: Subscription feature - removed from MVP to focus on core features
// This feature is fully implemented but disabled from the UI.
// All code is preserved for future re-enablement.
// To re-enable:
// 1. Restore the original routes below (they're in git history)
// 2. Re-add subscription navigation in app-shell.tsx
// 3. Re-add subscription widget in dashboard/page.tsx
// 4. Uncomment subscription-related code in runtime.ts

const { detectSubscriptions } = require('../lib/subscription-detection')
const db = require('../lib/db-subscriptions')

module.exports = async function subscriptionsRoute (fastify) {
  // All subscription routes disabled - return 404 for all subscription API calls
  // Original implementation preserved in git history (commit before this change)
  
  fastify.get('/api/subscriptions/*', async (request, reply) => {
    return reply.code(404).send({ 
      error: 'Subscription feature is currently disabled',
      message: 'This feature has been parked to focus on core MVP features. Code is preserved in git history.'
    })
  })
  
  fastify.post('/api/subscriptions/*', async (request, reply) => {
    return reply.code(404).send({ 
      error: 'Subscription feature is currently disabled',
      message: 'This feature has been parked to focus on core MVP features. Code is preserved in git history.'
    })
  })
  
  fastify.patch('/api/subscriptions/*', async (request, reply) => {
    return reply.code(404).send({ 
      error: 'Subscription feature is currently disabled',
      message: 'This feature has been parked to focus on core MVP features. Code is preserved in git history.'
    })
  })
}
