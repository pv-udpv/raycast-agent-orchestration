/**
 * Multi-Provider Inference Router
 * 
 * Coordinates routing across:
 * - Local: Ollama, MLX, HF Transformers, LM Studio
 * - Subscription: Claude (all tiers), GPT-4, GPT-3.5, Codex
 * - Hybrid: Perplexity (web search)
 * - Free tier: HF Inference API
 */

export type ProviderTier = "local" | "hybrid" | "subscription" | "free"

export interface ProviderConfig {
  id: string
  name: string
  tier: ProviderTier
  models: string[]
  baseUrl?: string
  apiKeyEnv?: string
  latencyBudget: number
  maxTokens: number
  supportsFunctions: boolean
  supportsStreaming: boolean
  costPer1kTokens: number
  fallbackTo?: string
  tags: string[]
}

export interface RoutingProfile {
  name: string
  description: string
  budget: number
  quality: "acceptable" | "high" | "highest"
  routing: string[] // provider IDs in order
  taskType: string
}

export interface InferenceRequest {
  task: string
  input: string
  budget?: number
  quality?: "acceptable" | "high" | "highest"
  profile?: string
}

export interface InferenceResult {
  providerId: string
  providerName: string
  output: string
  latency: number
  tokensUsed: number
  cost: number
  fallbackReason?: string
}

/**
 * Load provider registry from JSON
 */
export async function loadProviderRegistry(): Promise<Record<string, ProviderConfig>> {
  // In production, this would load from provider-registry.json
  return {
    "ollama-local": {
      id: "ollama-local",
      name: "Ollama",
      tier: "local",
      models: ["llama2", "mistral", "neural-chat", "codellama"],
      baseUrl: process.env.OLLAMA_HOST || "http://localhost:11434/api",
      latencyBudget: 2000,
      maxTokens: 4096,
      supportsFunctions: false,
      supportsStreaming: true,
      costPer1kTokens: 0,
      fallbackTo: "mlx-local",
      tags: ["local", "macos", "linux"]
    },
    "mlx-local": {
      id: "mlx-local",
      name: "MLX",
      tier: "local",
      models: ["Llama-2-7b", "Mistral-7B"],
      baseUrl: process.env.MLX_SERVER_HOST || "http://localhost:8000/v1",
      latencyBudget: 1500,
      maxTokens: 4096,
      supportsFunctions: false,
      supportsStreaming: true,
      costPer1kTokens: 0,
      fallbackTo: "hf-transformers",
      tags: ["local", "apple-silicon"]
    },
    "claude-opus": {
      id: "claude-opus",
      name: "Claude 3 Opus",
      tier: "subscription",
      models: ["claude-3-opus-20240229"],
      baseUrl: "https://api.anthropic.com",
      apiKeyEnv: "ANTHROPIC_API_KEY",
      latencyBudget: 3000,
      maxTokens: 4096,
      supportsFunctions: true,
      supportsStreaming: true,
      costPer1kTokens: 0.015,
      fallbackTo: "claude-sonnet",
      tags: ["subscription", "reasoning", "expensive"]
    },
    "claude-sonnet": {
      id: "claude-sonnet",
      name: "Claude 3 Sonnet",
      tier: "subscription",
      models: ["claude-3-sonnet-20240229"],
      baseUrl: "https://api.anthropic.com",
      apiKeyEnv: "ANTHROPIC_API_KEY",
      latencyBudget: 2000,
      maxTokens: 4096,
      supportsFunctions: true,
      supportsStreaming: true,
      costPer1kTokens: 0.003,
      fallbackTo: "claude-haiku",
      tags: ["subscription", "balanced"]
    },
    "claude-haiku": {
      id: "claude-haiku",
      name: "Claude 3 Haiku",
      tier: "subscription",
      models: ["claude-3-haiku-20240307"],
      baseUrl: "https://api.anthropic.com",
      apiKeyEnv: "ANTHROPIC_API_KEY",
      latencyBudget: 1000,
      maxTokens: 4096,
      supportsFunctions: true,
      supportsStreaming: true,
      costPer1kTokens: 0.00025,
      fallbackTo: "gpt-3.5-turbo",
      tags: ["subscription", "fast", "cheap"]
    },
    "gpt-4": {
      id: "gpt-4",
      name: "GPT-4 Turbo",
      tier: "subscription",
      models: ["gpt-4-turbo-preview"],
      baseUrl: "https://api.openai.com/v1",
      apiKeyEnv: "OPENAI_API_KEY",
      latencyBudget: 3000,
      maxTokens: 8192,
      supportsFunctions: true,
      supportsStreaming: true,
      costPer1kTokens: 0.03,
      fallbackTo: "gpt-3.5-turbo",
      tags: ["subscription", "code", "expensive"]
    },
    "gpt-3.5-turbo": {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      tier: "subscription",
      models: ["gpt-3.5-turbo"],
      baseUrl: "https://api.openai.com/v1",
      apiKeyEnv: "OPENAI_API_KEY",
      latencyBudget: 1500,
      maxTokens: 4096,
      supportsFunctions: true,
      supportsStreaming: true,
      costPer1kTokens: 0.0005,
      fallbackTo: "perplexity-online",
      tags: ["subscription", "fast", "cheap"]
    },
    "perplexity-online": {
      id: "perplexity-online",
      name: "Perplexity",
      tier: "hybrid",
      models: ["perplexity-online", "perplexity-sonar-pro"],
      baseUrl: "https://api.perplexity.ai/chat/completions",
      apiKeyEnv: "PPLX_API_KEY",
      latencyBudget: 5000,
      maxTokens: 4096,
      supportsFunctions: false,
      supportsStreaming: true,
      costPer1kTokens: 0.005,
      fallbackTo: "claude-opus",
      tags: ["hybrid", "web-search", "research"]
    },
    "hf-inference-api": {
      id: "hf-inference-api",
      name: "HF Inference API",
      tier: "free",
      models: ["meta-llama/Llama-2-7b-chat-hf"],
      baseUrl: "https://api-inference.huggingface.co/models",
      apiKeyEnv: "HUGGINGFACE_API_KEY",
      latencyBudget: 5000,
      maxTokens: 2048,
      supportsFunctions: false,
      supportsStreaming: false,
      costPer1kTokens: 0,
      fallbackTo: "claude-haiku",
      tags: ["free", "rate-limited"]
    }
  }
}

/**
 * Routing profiles for common tasks
 */
export function getRoutingProfiles(): Record<string, RoutingProfile> {
  return {
    "tree-normalization": {
      name: "Tree Normalization",
      description: "Fast, accurate state updates",
      budget: 2000,
      quality: "high",
      routing: ["ollama-local", "mlx-local", "claude-haiku", "gpt-3.5-turbo"],
      taskType: "classification"
    },
    "research-analysis": {
      name: "Research Analysis",
      description: "Deep reasoning with context",
      budget: 10000,
      quality: "highest",
      routing: ["perplexity-online", "claude-opus", "gpt-4"],
      taskType: "reasoning"
    },
    "code-generation": {
      name: "Code Generation",
      description: "Generate and fix code",
      budget: 5000,
      quality: "high",
      routing: ["ollama-local", "gpt-4", "claude-opus"],
      taskType: "code"
    },
    "manifest-export": {
      name: "Manifest Export",
      description: "JSON/Markdown generation",
      budget: 1500,
      quality: "high",
      routing: ["mlx-local", "ollama-local", "claude-haiku"],
      taskType: "classification"
    },
    "fallback": {
      name: "Fallback",
      description: "Always responds",
      budget: 60000,
      quality: "acceptable",
      routing: ["ollama-local", "mlx-local", "claude-haiku", "gpt-3.5-turbo", "hf-inference-api"],
      taskType: "fallback"
    }
  }
}

/**
 * Multi-provider inference router
 */
export class MultiProviderRouter {
  private providers: Record<string, ProviderConfig>
  private profiles: Record<string, RoutingProfile>
  private providerHealth: Map<string, { available: boolean; lastCheck: number }>

  constructor(providers: Record<string, ProviderConfig>, profiles: Record<string, RoutingProfile>) {
    this.providers = providers
    this.profiles = profiles
    this.providerHealth = new Map()
    
    // Initialize health status
    Object.keys(providers).forEach(id => {
      this.providerHealth.set(id, { available: true, lastCheck: 0 })
    })
  }

  /**
   * Route an inference request to the best available provider
   */
  async route(request: InferenceRequest): Promise<InferenceResult> {
    const profile = this.getProfile(request)
    const routingOrder = profile.routing

    for (const providerId of routingOrder) {
      const provider = this.providers[providerId]
      if (!provider) continue

      const health = this.providerHealth.get(providerId)
      if (!health?.available) {
        console.log(`[ROUTER] Skipping ${providerId} (unhealthy)`)
        continue
      }

      try {
        const startTime = Date.now()
        const result = await this.callProvider(provider, request)
        const latency = Date.now() - startTime

        // Update health
        this.providerHealth.set(providerId, { available: true, lastCheck: Date.now() })

        return {
          providerId: provider.id,
          providerName: provider.name,
          output: result,
          latency,
          tokensUsed: Math.ceil(result.length / 4), // rough estimate
          cost: Math.ceil(result.length / 4) / 1000 * provider.costPer1kTokens
        }
      } catch (error) {
        console.error(`[ROUTER] Error with ${providerId}:`, error)
        this.providerHealth.set(providerId, { available: false, lastCheck: Date.now() })
        // Continue to next provider
      }
    }

    throw new Error(`[ROUTER] All providers exhausted for task: ${request.task}`)
  }

  /**
   * Get routing profile for a request
   */
  private getProfile(request: InferenceRequest): RoutingProfile {
    if (request.profile && this.profiles[request.profile]) {
      return this.profiles[request.profile]
    }

    // Auto-detect profile based on task type
    if (request.task.includes("research") || request.task.includes("analysis")) {
      return this.profiles["research-analysis"]!
    }
    if (request.task.includes("code")) {
      return this.profiles["code-generation"]!
    }
    if (request.task.includes("manifest") || request.task.includes("export")) {
      return this.profiles["manifest-export"]!
    }
    if (request.task.includes("tree") || request.task.includes("normalize")) {
      return this.profiles["tree-normalization"]!
    }

    return this.profiles["fallback"]!
  }

  /**
   * Call a specific provider
   */
  private async callProvider(provider: ProviderConfig, request: InferenceRequest): Promise<string> {
    // Stub implementation - would branch to provider-specific clients
    // (Claude, OpenAI, Ollama, etc.)
    console.log(`[PROVIDER] Calling ${provider.name} with request: ${request.task}`)
    return `[${provider.name}] Response to: ${request.input.substring(0, 50)}...`
  }

  /**
   * Get provider info
   */
  getProviderInfo(providerId: string): ProviderConfig | null {
    return this.providers[providerId] || null
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): ProviderConfig[] {
    return Object.values(this.providers).filter(p => {
      const health = this.providerHealth.get(p.id)
      return health?.available
    })
  }

  /**
   * Get providers by tier
   */
  getProvidersByTier(tier: ProviderTier): ProviderConfig[] {
    return Object.values(this.providers).filter(p => p.tier === tier)
  }
}

/**
 * Factory: create router with default providers
 */
export async function createRouter(): Promise<MultiProviderRouter> {
  const providers = await loadProviderRegistry()
  const profiles = getRoutingProfiles()
  return new MultiProviderRouter(providers, profiles)
}

/**
 * Usage example
 */
export async function example() {
  const router = await createRouter()

  // Tree normalization task
  const result = await router.route({
    task: "tree-normalization",
    input: "Normalize chat folder structure"
  })

  console.log(`Used ${result.providerName} in ${result.latency}ms`)
  console.log(`Cost: $${result.cost.toFixed(6)}`)
  console.log(`Output: ${result.output}`)
}
