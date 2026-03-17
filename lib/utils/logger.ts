type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function formatMessage(context: string, message: unknown) {
  const base = `[${context}]`
  if (message instanceof Error) {
    return `${base} ${message.name}: ${message.message}\n${message.stack ?? ''}`
  }
  if (typeof message === 'object') {
    try {
      return `${base} ${JSON.stringify(message)}`
    } catch {
      return `${base} ${String(message)}`
    }
  }
  return `${base} ${String(message)}`
}

function log(level: LogLevel, context: string, error: unknown) {
  const msg = formatMessage(context, error)
  switch (level) {
    case 'debug':
      console.debug(msg)
      break
    case 'info':
      console.info(msg)
      break
    case 'warn':
      console.warn(msg)
      break
    case 'error':
    default:
      console.error(msg)
      break
  }
}

export function logError(context: string, error: unknown) {
  log('error', context, error)
  persistErrorEvent(context, error)
}

function persistErrorEvent(context: string, error: unknown) {
  try {
    const { hasDatabase } = require('@/lib/db/client')
    const { adminEventsAppend } = require('@/lib/db/admin-events-db')
    if (hasDatabase()) {
      const msg = error instanceof Error ? error.message : String(error)
      void adminEventsAppend('error', context, msg).catch(() => {})
    }
  } catch {
    // ignore
  }
}

export function logWarn(context: string, error: unknown) {
  log('warn', context, error)
}

export function logInfo(context: string, message: unknown) {
  log('info', context, message)
}

export function logDebug(context: string, message: unknown) {
  log('debug', context, message)
}

