/**
 * Multi-Provider Model Router
 * Routes queries to Claude (remote), Comet (web-aware), Perplexity MLX (local), Codex (fallback)
 * Implements intelligent fallback chain with health checks
 */

import type { AgentTask, AgentResult } from '../types/agent.js';

export type ProviderName = 'claude' | 'comet' | 'pplx-mlx' | 'codex';

export interface ProviderConfig {
  name: ProviderName;
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  healthCheckUrl?: string;
  priority: number; // Lower = higher priority
  enabled: boolean;
}

export interface RoutingContext {
  task: AgentTask;
  context?: Record<string, unknown>;
  urgency?: 'low' | 'medium' | 'high'; // high = local inference preferred
  requiresWeb?: boolean; // true = use Comet or Claude
  requiresCode?: boolean; // true = use Codex or Claude
}

export interface ProviderResponse {
  provider: ProviderName;
  output: string;
  metadata: {
    latency: number;
    tokens?: number;
    model?: string;
  };
}

export class ProviderRouter {
  private providers: Map<ProviderName, ProviderConfig> = new Map();
  private healthCache: Map<ProviderName, { healthy: boolean; timestamp: number }> =
    new Map();
  private readonly HEALTH_CACHE_TTL = 30000; // 30 seconds

  constructor(configs: ProviderConfig[]) {
    configs.forEach((config) => {
      this.providers.set(config.name, config);
      this.healthCache.set(config.name, { healthy: true, timestamp: 0 });
    });
  }

  /**
   * Route a request to the best available provider
   */
  async route(context: RoutingContext): Promise<ProviderResponse> {
    const candidates = await this.getCandidates(context);

    if (candidates.length === 0) {
      throw new Error('No providers available');
    }

    for (const providerName of candidates) {
      try {
        const response = await this.invokeProvider(providerName, context);
        return response;
      } catch (err) {
        console.warn(`Provider ${providerName} failed:`, err);
        // Continue to next candidate
      }
    }

    throw new Error('All providers exhausted');
  }

  /**
   * Get sorted list of candidate providers based on context
   */
  private async getCandidates(context: RoutingContext): Promise<ProviderName[]> {
    const allProviders = Array.from(this.providers.values())
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Check health in parallel
    const healthChecks = await Promise.all(
      allProviders.map(async (p) => ({
        name: p.name,
        healthy: await this.isHealthy(p.name),
      }))
    );

    const healthy = healthChecks
      .filter((h) => h.healthy)
      .map((h) => h.name);

    if (healthy.length === 0) {
      return allProviders.map((p) => p.name);
    }

    // Apply routing rules
    const sorted = healthy.sort((a, b) => {
      const configA = this.providers.get(a)!;
      const configB = this.providers.get(b)!;

      // Rule 1: Urgency = high → prefer local (pplx-mlx)
      if (context.urgency === 'high') {
        if (a === 'pplx-mlx') return -1;
        if (b === 'pplx-mlx') return 1;
      }

      // Rule 2: RequiresWeb → prefer Comet, then Claude
      if (context.requiresWeb) {
        if (a === 'comet') return -1;
        if (b === 'comet') return 1;
        if (a === 'claude') return -1;
        if (b === 'claude') return 1;
      }

      // Rule 3: RequiresCode → prefer Codex, then Claude
      if (context.requiresCode) {
        if (a === 'codex') return -1;
        if (b === 'codex') return 1;
        if (a === 'claude') return -1;
        if (b === 'claude') return 1;
      }

      // Default: Priority order
      return configA.priority - configB.priority;
    });

    return sorted;
  }

  /**
   * Check provider health with caching
   */
  private async isHealthy(providerName: ProviderName): Promise<boolean> {
    const config = this.providers.get(providerName);
    if (!config) return false;

    // Check cache
    const cached = this.healthCache.get(providerName);
    if (cached && Date.now() - cached.timestamp < this.HEALTH_CACHE_TTL) {
      return cached.healthy;
    }

    // Perform health check
    const healthy = await this.performHealthCheck(config);
    this.healthCache.set(providerName, { healthy, timestamp: Date.now() });

    return healthy;
  }

  /**
   * Perform actual health check against provider
   */
  private async performHealthCheck(config: ProviderConfig): Promise<boolean> {
    if (!config.healthCheckUrl) return true; // Assume healthy if no check URL

    try {
      const response = await fetch(config.healthCheckUrl, {
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Invoke provider with appropriate protocol
   */
  private async invokeProvider(
    providerName: ProviderName,
    context: RoutingContext
  ): Promise<ProviderResponse> {
    const config = this.providers.get(providerName);
    if (!config) throw new Error(`Provider ${providerName} not configured`);

    const startTime = Date.now();

    switch (providerName) {
      case 'claude':
        return this.invokeClaude(config, context, startTime);

      case 'comet':
        return this.invokeComet(config, context, startTime);

      case 'pplx-mlx':
        return this.invokePplxMlx(config, context, startTime);

      case 'codex':
        return this.invokeCodex(config, context, startTime);

      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  private async invokeClaude(
    config: ProviderConfig,
    context: RoutingContext,
    startTime: number
  ): Promise<ProviderResponse> {
    // Placeholder: Real implementation would use Claude API
    return {
      provider: 'claude',
      output: `Claude response for task: ${context.task.id}`,
      metadata: {
        latency: Date.now() - startTime,
        model: 'claude-opus',
      },
    };
  }

  private async invokeComet(
    config: ProviderConfig,
    context: RoutingContext,
    startTime: number
  ): Promise<ProviderResponse> {
    // Placeholder: Real implementation would use Comet (web-aware) API
    return {
      provider: 'comet',
      output: `Comet web-aware response for task: ${context.task.id}`,
      metadata: {
        latency: Date.now() - startTime,
        model: 'comet-web',
      },
    };
  }

  private async invokePplxMlx(
    config: ProviderConfig,
    context: RoutingContext,
    startTime: number
  ): Promise<ProviderResponse> {
    // Invoke local Perplexity MLX inference at 100.77.133.10:49320
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma-4-e4b',
        messages: [{ role: 'user', content: context.task.description || '' }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
      timeout: config.timeout,
    });

    if (!response.ok) {
      throw new Error(`MLX inference failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };

    return {
      provider: 'pplx-mlx',
      output: data.choices[0]?.message.content || '',
      metadata: {
        latency: Date.now() - startTime,
        model: 'gemma-4-e4b-mlx',
        tokens: data.usage?.total_tokens,
      },
    };
  }

  private async invokeCodex(
    config: ProviderConfig,
    context: RoutingContext,
    startTime: number
  ): Promise<ProviderResponse> {
    // Placeholder: Real implementation would use Codex (code-focused) API
    return {
      provider: 'codex',
      output: `Codex code response for task: ${context.task.id}`,
      metadata: {
        latency: Date.now() - startTime,
        model: 'codex-003',
      },
    };
  }

  /**
   * Update provider configuration at runtime
   */
  updateProviderConfig(name: ProviderName, config: Partial<ProviderConfig>): void {
    const existing = this.providers.get(name);
    if (!existing) throw new Error(`Provider ${name} not found`);

    this.providers.set(name, { ...existing, ...config });
    this.healthCache.set(name, { healthy: true, timestamp: 0 }); // Reset health
  }

  /**
   * Get current routing state
   */
  getRoutingState() {
    return {
      providers: Array.from(this.providers.values()).map((p) => ({
        name: p.name,
        enabled: p.enabled,
        priority: p.priority,
        healthy: this.healthCache.get(p.name)?.healthy || false,
      })),
    };
  }
}
