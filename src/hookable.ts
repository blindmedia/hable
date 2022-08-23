import { flatHooks, parallelCaller, serialCaller, callEachWith } from './utils'
import type { DeprecatedHook, NestedHooks, HookCallback, HookKeys } from './types'

type InferCallback<HT, HN extends keyof HT> = HT[HN] extends HookCallback ? HT[HN] : never
type InferSpyEvent<HT extends Record<string, any>> = {
  [key in keyof HT]: { name: key, args: Parameters<HT[key]>, context: Record<string, any> }
}[keyof HT]

export class Hookable <
  HooksT = Record<string, HookCallback>,
  HookNameT extends HookKeys<HooksT> = HookKeys<HooksT>
> {
  private _hooks: { [key: string]: HookCallback[] }
  private _before: HookCallback[]
  private _after: HookCallback[]
  private _deprecatedHooks: Record<string, DeprecatedHook<HooksT>>

  constructor () {
    this._hooks = {}
    this._before = null
    this._after = null
    this._deprecatedHooks = {}

    // Allow destructuring hook and callHook functions out of instance object
    this.hook = this.hook.bind(this)
    this.callHook = this.callHook.bind(this)
    this.callHookWith = this.callHookWith.bind(this)
  }

  hook<NameT extends HookNameT> (name: NameT, fn: InferCallback<HooksT, NameT>) {
    if (!name || typeof fn !== 'function') {
      return () => {}
    }

    const originalName = name
    let deprecatedHookObj: Exclude<DeprecatedHook<HooksT>, string>
    while (this._deprecatedHooks[name]) {
      const deprecatedHook = this._deprecatedHooks[name]
      if (typeof deprecatedHook === 'string') {
        deprecatedHookObj = { to: deprecatedHook as NameT }
      } else {
        deprecatedHookObj = deprecatedHook
      }
      name = deprecatedHookObj.to as NameT
    }
    if (deprecatedHookObj) {
      if (!deprecatedHookObj.message) {
        console.warn(
          `${originalName} hook has been deprecated` +
          (deprecatedHookObj.to ? `, please use ${deprecatedHookObj.to}` : '')
        )
      } else {
        console.warn(deprecatedHookObj.message)
      }
    }

    this._hooks[name] = this._hooks[name] || []
    this._hooks[name].push(fn)

    return () => {
      if (fn) {
        this.removeHook(name, fn)
        fn = null // Free memory
      }
    }
  }

  hookOnce<NameT extends HookNameT> (name: NameT, fn: InferCallback<HooksT, NameT>) {
    let _unreg: () => void
    let _fn = (...args: any) => {
      _unreg()
      _unreg = null
      _fn = null
      return fn(...args)
    }
    _unreg = this.hook(name, _fn as typeof fn)
    return _unreg
  }

  removeHook<NameT extends HookNameT> (name: NameT, fn: InferCallback<HooksT, NameT>) {
    if (this._hooks[name]) {
      const idx = this._hooks[name].indexOf(fn)

      if (idx !== -1) {
        this._hooks[name].splice(idx, 1)
      }

      if (this._hooks[name].length === 0) {
        delete this._hooks[name]
      }
    }
  }

  deprecateHook <NameT extends HookNameT> (name: NameT, deprecated: DeprecatedHook<HooksT>) {
    this._deprecatedHooks[name] = deprecated
    const _hooks = this._hooks[name] || []
    this._hooks[name] = undefined
    for (const hook of _hooks) {
      this.hook(name, hook as any)
    }
  }

  deprecateHooks (deprecatedHooks: Record<HookNameT, DeprecatedHook<HooksT>>) {
    Object.assign(this._deprecatedHooks, deprecatedHooks)
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name])
    }
  }

  addHooks (configHooks: NestedHooks<HooksT>) {
    const hooks = flatHooks<HooksT>(configHooks)
    // @ts-ignore
    const removeFns = Object.keys(hooks).map(key => this.hook(key, hooks[key]))

    return () => {
      // Splice will ensure that all fns are called once, and free all
      // unreg functions from memory.
      removeFns.splice(0, removeFns.length).forEach(unreg => unreg())
    }
  }

  removeHooks (configHooks: NestedHooks<HooksT>) {
    const hooks = flatHooks<HooksT>(configHooks)
    for (const key in hooks) {
      // @ts-ignore
      this.removeHook(key, hooks[key])
    }
  }

  callHook<NameT extends HookNameT> (name: NameT, ...args: Parameters<InferCallback<HooksT, NameT>>) {
    return this.callHookWith(serialCaller, name, ...args)
  }

  callHookParallel<NameT extends HookNameT> (name: NameT, ...args: Parameters<InferCallback<HooksT, NameT>>) {
    return this.callHookWith(parallelCaller, name, ...args)
  }

  callHookWith<NameT extends HookNameT, CallFunction extends (hooks: HookCallback[], args: Parameters<InferCallback<HooksT, NameT>>) => any> (caller: CallFunction, name: NameT, ...args: Parameters<InferCallback<HooksT, NameT>>): void | ReturnType<CallFunction> {
    const event = (this._before || this._after) ? { name, args, context: {} } : undefined
    if (this._before) {
      callEachWith(this._before, event)
    }
    const result = caller(this._hooks[name] || [], args)
    if (result as any instanceof Promise) {
      return result.finally(() => {
        if (this._after) {
          callEachWith(this._after, event)
        }
      })
    }
    if (this._after) {
      callEachWith(this._after, event)
    }
    return result
  }

  beforeEach (fn: (event: InferSpyEvent<HooksT>) => void) {
    this._before = this._before || []
    this._before.push(fn)
  }

  afterEach (fn: (event: InferSpyEvent<HooksT>) => void) {
    this._after = this._after || []
    this._after.push(fn)
  }
}

export function createHooks<T> (): Hookable<T> {
  return new Hookable<T>()
}
