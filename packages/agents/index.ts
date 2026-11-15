/**
 * Minimal Agents SDK shim over Cloudflare Durable Objects.
 *
 * - Extends the real `DurableObject` base, so DO branding and RPC stub typing work.
 * - State is persisted in DO storage and rehydrated on cold start; the first
 *   instantiation pins `initialState` (so values like `crypto.randomUUID()` are stable).
 * - Only methods decorated with `@callable()` are dispatchable by name.
 */

import { DurableObject } from "cloudflare:workers"

const STATE_KEY = "__agent_state__"
const CALLABLE = Symbol.for("agents.callable")
const STREAMING = Symbol.for("agents.streaming")

export class Agent<Env = unknown, State = unknown> extends DurableObject<Env> {
  /** Subclasses provide the default state for a fresh instance. */
  declare initialState: State
  /**
   * Upper bound on serialized state. SQLite-backed DO storage caps key+value at 2 MB;
   * the default keeps 50% headroom. Subclasses may lower it.
   */
  protected maxStateBytes = 1024 * 1024
  #state: State | undefined

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    void ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<State>(STATE_KEY)
      // Subclass field initializers have run by the time this continuation resumes.
      if (stored !== undefined) {
        this.#state = stored
      } else if (this.initialState !== undefined) {
        this.#state = this.initialState
        await ctx.storage.put(STATE_KEY, this.#state)
      }
    })
  }

  protected get state(): State {
    return (this.#state ?? this.initialState) as State
  }

  /**
   * Validates size BEFORE mutating memory or storage, so an oversized write is rejected
   * cleanly instead of failing inside the storage output gate and resetting the object.
   * Throws RangeError("[limit] ..."); the message survives RPC for status mapping.
   */
  protected setState(next: State): void {
    const bytes = new TextEncoder().encode(JSON.stringify(next)).byteLength
    if (bytes > this.maxStateBytes) {
      throw new RangeError(`[limit] state is ${bytes} bytes; budget is ${this.maxStateBytes}`)
    }
    this.#state = next
    void this.ctx.storage.put(STATE_KEY, next)
  }

  /** True when `name` resolves to a method decorated with `@callable()`. */
  protected isCallable(name: string): boolean {
    const fn = (this as Record<string, unknown>)[name]
    return typeof fn === "function" && (fn as unknown as Record<symbol, unknown>)[CALLABLE] === true
  }

  protected sql(_template: TemplateStringsArray, ..._values: unknown[]) {
    return {
      bind: (..._args: unknown[]) => ({ first: () => null, all: () => [] }),
      first: () => null,
      all: () => [],
    }
  }
}

export function callable(opts?: { streaming?: boolean }) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    descriptor.value[CALLABLE] = true
    if (opts?.streaming) descriptor.value[STREAMING] = true
    return descriptor
  }
}

export function routeAgentRequest(_req: Request, _env: unknown): Response | null {
  return null
}
