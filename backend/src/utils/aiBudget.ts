/**
 * Shared AI Budget and Token Usage Tracker
 * Applies rate limiting and daily cost governance across both Gemini and Groq providers.
 */

interface BudgetState {
  currentDay: string; // YYYY-MM-DD UTC
  totalTokensToday: number;
  estimatedCostTodayUSD: number;
  totalQueriesToday: number;
}

// In-memory daily usage state
const budgetState: BudgetState = {
  currentDay: new Date().toISOString().split('T')[0],
  totalTokensToday: 0,
  estimatedCostTodayUSD: 0,
  totalQueriesToday: 0
};

// Blended estimated cost per token in USD (~$0.15 per 1M tokens)
const BLENDED_COST_PER_TOKEN_USD = 0.00000015;

function ensureCurrentDay(): void {
  const today = new Date().toISOString().split('T')[0];
  if (budgetState.currentDay !== today) {
    budgetState.currentDay = today;
    budgetState.totalTokensToday = 0;
    budgetState.estimatedCostTodayUSD = 0;
    budgetState.totalQueriesToday = 0;
  }
}

/**
 * Checks whether the shared daily budget limit has been reached
 */
export function isBudgetExceeded(): boolean {
  ensureCurrentDay();
  const limit = parseFloat(process.env.AI_DAILY_BUDGET_LIMIT || '10.00');
  if (isNaN(limit) || limit <= 0) return false;
  return budgetState.estimatedCostTodayUSD >= limit;
}

/**
 * Records tokens used by an AI response and calculates estimated cost
 */
export function recordTokenUsage(tokens: number, provider: string): void {
  ensureCurrentDay();
  const validTokens = Math.max(0, Math.round(tokens));
  budgetState.totalTokensToday += validTokens;
  budgetState.totalQueriesToday += 1;
  budgetState.estimatedCostTodayUSD += validTokens * BLENDED_COST_PER_TOKEN_USD;
}

/**
 * Returns current daily budget status
 */
export function getBudgetStatus() {
  ensureCurrentDay();
  const limit = parseFloat(process.env.AI_DAILY_BUDGET_LIMIT || '10.00');
  return {
    day: budgetState.currentDay,
    totalTokensToday: budgetState.totalTokensToday,
    totalQueriesToday: budgetState.totalQueriesToday,
    estimatedCostTodayUSD: Number(budgetState.estimatedCostTodayUSD.toFixed(4)),
    dailyBudgetLimitUSD: limit,
    isExceeded: isBudgetExceeded(),
    resetTimeUTC: `${budgetState.currentDay}T23:59:59.999Z`
  };
}

interface ProviderMetric {
  requests: number;
  successes: number;
  failures: number;
  timeouts: number;
  totalLatencyMs: number;
  lastCallAt: string | null;
  lastError: string | null;
}

const providerMetrics: Record<string, ProviderMetric> = {
  gemini: { requests: 0, successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, lastCallAt: null, lastError: null },
  groq: { requests: 0, successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, lastCallAt: null, lastError: null },
  openai: { requests: 0, successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, lastCallAt: null, lastError: null },
  deepseek: { requests: 0, successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, lastCallAt: null, lastError: null },
  local: { requests: 0, successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, lastCallAt: null, lastError: null }
};

let totalFailoversToday = 0;

export function recordProviderCall(
  provider: string,
  success: boolean,
  latencyMs: number,
  isTimeout = false,
  errorMsg?: string,
  isFailover = false
): void {
  const norm = provider.toLowerCase().split(' ')[0];
  if (!providerMetrics[norm]) {
    providerMetrics[norm] = { requests: 0, successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, lastCallAt: null, lastError: null };
  }
  const m = providerMetrics[norm];
  m.requests += 1;
  if (success) {
    m.successes += 1;
  } else {
    m.failures += 1;
    if (isTimeout) m.timeouts += 1;
    if (errorMsg) m.lastError = errorMsg.slice(0, 160);
  }
  m.totalLatencyMs += latencyMs;
  m.lastCallAt = new Date().toISOString();
  if (isFailover) {
    totalFailoversToday += 1;
  }
}

export function getProviderHealthMetrics() {
  const providers = Object.entries(providerMetrics).map(([name, m]) => {
    const avgLatency = m.requests > 0 ? Math.round(m.totalLatencyMs / m.requests) : 0;
    const successRate = m.requests > 0 ? Math.round((m.successes / m.requests) * 100) : 100;
    const status = m.requests === 0 ? 'STANDBY' : (successRate >= 80 ? 'HEALTHY' : (successRate >= 50 ? 'DEGRADED' : 'UNHEALTHY'));
    return {
      name,
      status,
      requests: m.requests,
      successes: m.successes,
      failures: m.failures,
      timeouts: m.timeouts,
      successRate,
      avgLatencyMs: avgLatency,
      lastCallAt: m.lastCallAt,
      lastError: m.lastError
    };
  });

  return {
    failoversToday: totalFailoversToday,
    providers
  };
}

