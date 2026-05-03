// Host-side script runner.
//
// Lazily creates a single hidden sandboxed iframe, talks to it via postMessage,
// and exposes a Promise-based runScript(code, ctx) function.
//
// The sandbox loads /sandbox.html and is reused across runs.

const SANDBOX_URL = '/sandbox.html'
const READY_TIMEOUT = 5000 // 5s to load
const RUN_TIMEOUT = 10000 // 10s per script

let iframe = null
let iframeReady = null // Promise that resolves when iframe sends 'ready'
const pending = new Map() // id -> { resolve, reject, timer }

function ensureIframe() {
  if (iframe) return iframeReady

  iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-scripts')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:absolute; width:0; height:0; border:0; visibility:hidden;'
  iframe.src = SANDBOX_URL

  iframeReady = new Promise((resolve, reject) => {
    const readyTimer = setTimeout(() => {
      reject(new Error('Sandbox failed to load within 5s'))
    }, READY_TIMEOUT)

    const onMessage = (event) => {
      // The sandbox iframe has origin "null" — we accept it because we're
      // the only ones who created an iframe pointing at sandbox.html.
      // We do verify by source.
      if (event.source !== iframe.contentWindow) return
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'ready') {
        clearTimeout(readyTimer)
        resolve()
        return
      }

      if (data.type === 'done' && data.id != null) {
        const entry = pending.get(data.id)
        if (!entry) return
        clearTimeout(entry.timer)
        pending.delete(data.id)
        entry.resolve(data)
      }
    }

    window.addEventListener('message', onMessage)
  })

  document.body.appendChild(iframe)
  return iframeReady
}

let nextId = 1

export async function runScript(code, ctx = {}) {
  if (!code || !code.trim()) {
    return {
      tests: [],
      envChanges: { set: {}, unset: [] },
      consoleLog: [],
      error: null,
    }
  }

  await ensureIframe()

  const id = nextId++

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      // Hard reset: kill the iframe so a runaway script can't keep eating CPU
      resetSandbox()
      reject(new Error('Script timed out after ' + (RUN_TIMEOUT / 1000) + 's'))
    }, RUN_TIMEOUT)

    pending.set(id, { resolve, reject, timer })

    iframe.contentWindow.postMessage(
      {
        type: 'run',
        id,
        code,
        ctx,
      },
      '*'
    )
  })
}

// Tear down and recreate the sandbox. Used after timeouts and for tests.
export function resetSandbox() {
  if (iframe) {
    iframe.remove()
    iframe = null
    iframeReady = null
  }
  // Reject anything still pending
  pending.forEach((entry) => {
    clearTimeout(entry.timer)
    entry.reject(new Error('Sandbox was reset'))
  })
  pending.clear()
}