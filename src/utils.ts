import type { NestedHooks, HookCallback, CreateDebuggerOptions } from './types'
import type { Hookable } from '.'

export function flatHooks<T> (configHooks: NestedHooks<T>, hooks: T = {} as T, parentName?: string): T {
  for (const key in configHooks) {
    const subHook = configHooks[key]
    const name = parentName ? `${parentName}:${key}` : key
    if (typeof subHook === 'object' && subHook !== null) {
      flatHooks(subHook, hooks, name)
    } else if (typeof subHook === 'function') {
      // @ts-ignore
      hooks[name] = subHook
    }
  }
  return hooks as any
}

export function mergeHooks<T> (...hooks: NestedHooks<T>[]): T {
  const finalHooks = {} as any

  for (const hook of hooks) {
    const flatenHook = flatHooks(hook)
    for (const key in flatenHook) {
      if (finalHooks[key]) {
        finalHooks[key].push(flatenHook[key])
      } else {
        finalHooks[key] = [flatenHook[key]]
      }
    }
  }

  for (const key in finalHooks) {
    if (finalHooks[key].length > 1) {
      const arr = finalHooks[key]
      finalHooks[key] = (...args) => serial(arr, (fn: any) => fn(...args))
    } else {
      finalHooks[key] = finalHooks[key][0]
    }
  }

  return finalHooks as any
}

export function serial<T> (tasks: T[], fn: (task: T) => Promise<any> | any) {
  return tasks.reduce((promise, task) => promise.then(() => fn(task)), Promise.resolve(null))
}

export function serialCaller (hooks: HookCallback[], args?: any[]) {
  return hooks.reduce((promise, hookFn) => promise.then(() => hookFn.apply(undefined, args)), Promise.resolve(null))
}

export function parallelCaller (hooks: HookCallback[], args?: any[]) {
  return Promise.all(hooks.map(hook => hook.apply(undefined, args)))
}

export function callEachWith (callbacks: Function[], arg0?: any) {
  for (const cb of callbacks) {
    cb(arg0)
  }
}

const isBrowser = typeof window !== 'undefined'

/** Start debugging hook names and timing in console */
export function createDebugger (hooks: Hookable<any>, _options: CreateDebuggerOptions = {}) {
  const options = <CreateDebuggerOptions> {
    inspect: isBrowser,
    group: isBrowser,
    filter: () => true,
    ..._options
  }

  const _filter = options.filter
  const filter = typeof _filter === 'string' ? (name: string) => name.startsWith(_filter) : _filter

  const _tag = options.tag ? `[${options.tag}] ` : ''
  const logPrefix = event => _tag + event.name + ''.padEnd(event._id, '\0')

  const _idCtr: Record<string, number> = {}

  // Before each
  const unsubscribeBefore = hooks.beforeEach((event: any) => {
    if (!filter(event.name)) { return }
    _idCtr[event.name] = _idCtr[event.name] || 0
    event._id = _idCtr[event.name]++
    console.time(logPrefix(event))
  })

  // After each
  const unsubscribeAfter = hooks.afterEach((event) => {
    if (!filter(event.name)) { return }
    if (options.group) {
      console.groupCollapsed(event.name)
    }
    if (options.inspect) {
      console.timeLog(logPrefix(event), event.args)
    } else {
      console.timeEnd(logPrefix(event))
    }
    if (options.group) {
      console.groupEnd()
    }
    _idCtr[event.name]--
  })

  return {
    /** Stop debugging and remove listeners */
    close: () => {
      unsubscribeBefore()
      unsubscribeAfter()
    }
  }
}
