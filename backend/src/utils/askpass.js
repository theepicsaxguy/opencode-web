#!/usr/bin/env node

// Compiled askpass script for Git operations
// Supports HTTPS username/password and SSH passphrase prompts
// Handles silent flag to skip prompts (VSCode-compatible)

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// Get environment variables
const cwd = process.cwd()
const silent = process.env.VSCODE_GIT_FETCH_SILENT === 'true' || 
               process.env.GIT_FETCH_SILENT === 'true' ||
               process.argv.includes('--silent')

// Get server URL from environment or fallback
const getServerUrl = () => {
  // Try to get from environment first
  const baseUrl = process.env.OPENCODE_SERVER_URL || 
                  process.env.VSCODE_GIT_SERVER_URL ||
                  'http://localhost:5001'
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

// Extract hostname from prompt for caching key
const extractHostname = (prompt) => {
  const httpsMatch = prompt.match(/https?:\/\/([^\/]+)/i)
  const sshMatch = prompt.match(/([^@]+@[^:]+)/)
  return httpsMatch?.[1] || sshMatch?.[1] || 'unknown'
}

// Make HTTP request to backend
const makeRequest = (url, data) => {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://')
    const client = isHttps ? https : http
    
    const postData = JSON.stringify(data)
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = client.request(url, options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          resolve({ ok: res.statusCode === 200, data })
        } catch (e) {
          reject(new Error('Invalid JSON response'))
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

// Main askpass logic
async function main() {
  const prompt = process.argv[2] || ''
  
  if (!prompt) {
    process.exit(1)
  }

  // Handle silent mode - exit early without prompting
  if (silent) {
    console.log('')
    process.exit(0)
  }

  try {
    const serverUrl = getServerUrl()
    const hostname = extractHostname(prompt)
    
    const response = await makeRequest(`${serverUrl}/git/askpass`, {
      prompt,
      cwd,
      hostname
    })

    if (!response.ok) {
      console.log('')
      process.exit(1)
    }

    const result = response.data
    console.log(result.token || result.password || result.passphrase || '')
    
  } catch (error) {
    console.log('')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(() => {
    console.log('')
    process.exit(1)
  })
}

module.exports = { main }