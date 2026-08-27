/**
 * Cloudflare Agents SDK — Stubs
 * 
 * Mock implementation for local development.
 * Replace with real @cloudflare/agents in production.
 */

export class Agent<Env = any, State = any> {
  protected env: Env
  protected state: State
  protected initialState: State

  constructor() {
    this.state = this.initialState
  }

  protected setState(nextState: State) {
    this.state = nextState
  }

  protected sql(template: TemplateStringsArray, ...values: any[]) {
    // Stub SQL execution
    return {
      bind: (...args: any[]) => ({ first: () => null, all: () => [] }),
      first: () => null,
      all: () => []
    }
  }
}

export function callable(opts?: { streaming?: boolean }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.value.__callable = true
    if (opts?.streaming) {
      descriptor.value.__streaming = true
    }
    return descriptor
  }
}

export function routeAgentRequest(req: Request, env: any) {
  // Stub routing
  return null
}

export type DurableObjectNamespace = any
