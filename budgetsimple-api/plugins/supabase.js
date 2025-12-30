'use strict'

const fp = require('fastify-plugin')
const { createClient } = require('@supabase/supabase-js')

async function supabasePlugin (fastify, opts) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    fastify.log.warn('Supabase credentials not found. Using stub mode.')
    fastify.decorate('supabase', null)
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  fastify.decorate('supabase', supabase)
  fastify.log.info('Supabase client initialized')
}

module.exports = fp(supabasePlugin, {
  name: 'supabase'
})

