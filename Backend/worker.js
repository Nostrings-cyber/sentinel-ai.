
// Sentinel AI Cloudflare Worker
// Source mirror of the deployed sentinel-api Worker.
// This file is for source review. Editing it does not deploy changes.
// Required Cloudflare secret: NEARBLOCKS_API_KEY.
// Never put the actual API key in this file.

const ALLOWED_ORIGIN = "https://nostrings-cyber.github.io";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":
      origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function validAccount(account) {
  return /^[a-z0-9._-]{2,64}$/.test(account);
}

async function fetchTransactions(account, env, nextPage = null) {
  const apiUrl = new URL(
    "https://api.nearblocks.io/v3/accounts/" +
    encodeURIComponent(account) +
    "/txns"
  );

  apiUrl.searchParams.set("limit", "20");

  if (nextPage) {
    apiUrl.searchParams.set("next", nextPage);
  }

  const response = await fetch(apiUrl.toString(), {
    headers: {
      "Authorization": `Bearer ${env.NEARBLOCKS_API_KEY}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("NEARBLOCKS_" + response.status);
  }

  const data = await response.json();

  return {
    transactions: Array.isArray(data.data) ? data.data : [],
    pagination: data.pagination || data.meta || {},
    upstreamKeys: Object.keys(data),
    rawPagination: data.pagination ?? null,
    upstreamMeta: data.meta ?? null
  };
}

async function fetchTransactionHistory(account, env, firstPage) {
  const MAX_PAGES = 5;
  const transactions = [...firstPage.transactions];
  let nextPage = firstPage.pagination?.next_page || null;
  let pagesFetched = 1;
  const seenCursors = new Set();

  while (nextPage && pagesFetched < MAX_PAGES) {
    if (seenCursors.has(nextPage)) break;
    seenCursors.add(nextPage);

    const page = await fetchTransactions(account, env, nextPage);

    if (page.transactions.length === 0) {
      nextPage = null;
      break;
    }

    transactions.push(...page.transactions);
    pagesFetched++;
    nextPage = page.pagination?.next_page || null;
  }

  const uniqueTransactions = Array.from(
    new Map(
      transactions.map(tx => [
        tx.transaction_hash || JSON.stringify(tx),
        tx
      ])
    ).values()
  );

  return {
    transactions: uniqueTransactions,
    pagesFetched,
    hasMoreHistory: Boolean(nextPage)
  };
}

function getTimestamp(tx) {
  const raw = tx.block_timestamp;

  if (raw === undefined || raw === null) return null;

  const value = Number(raw);

  if (!Number.isFinite(value)) return null;

  // NEAR block timestamps are normally in nanoseconds.
  return value > 1e15 ? value / 1e6 : value;
}

function analyzeCounterpartyHistory(
  agentAccount,
  counterparty,
  transactions,
  history = {}
) {
  const interactions = transactions.filter(
    tx => tx.receiver_account_id === counterparty
  );

  let successful = 0;
  let failed = 0;
  let unknown = 0;

  for (const tx of interactions) {
    const status = tx.outcomes?.status;

    if (status === true || status === "SUCCESS") {
      successful++;
    } else if (
      status === false ||
      status === "FAILURE" ||
      status === "FAILED"
    ) {
      failed++;
    } else {
      unknown++;
    }
  }

  const timestamps = interactions
    .map(getTimestamp)
    .filter(value => value !== null)
    .sort((a, b) => b - a);

  return {
    agentAccount,
    counterparty,
    direction: "OUTGOING_FROM_INSPECTED_ACCOUNT",
    sampledInteractions: interactions.length,
    successfulInteractions: successful,
    failedInteractions: failed,
    unknownOutcomes: unknown,
    latestObservedInteraction: timestamps.length
      ? new Date(timestamps[0]).toISOString()
      : null,
    sampledAccountTransactions: transactions.length,
    historyLimit: 100,
    hasMoreAccountHistory: history.hasMoreHistory ?? false,
    scope: "Outgoing interactions found in the sampled account transaction history. This is not a complete lifetime history or proof of agent identity."
  };
}

function analyzeTransactions(account, transactions, history = {}) {
  let failed = 0;
  let unknownOutcomes = 0;

  const receiverCounts = {};

  for (const tx of transactions) {
    const status = tx.outcomes?.status;

    if (
      status === false ||
      status === "FAILURE" ||
      status === "FAILED"
    ) {
      failed++;
    } else if (status !== true && status !== "SUCCESS") {
      unknownOutcomes++;
    }

    const receiver = tx.receiver_account_id;

    if (receiver && receiver !== account) {
      receiverCounts[receiver] =
        (receiverCounts[receiver] || 0) + 1;
    }
  }

  const timestamps = transactions
    .map(getTimestamp)
    .filter(value => value !== null)
    .sort((a, b) => b - a);

  let burstCount = 0;

  if (timestamps.length > 0) {
    burstCount = timestamps.filter(
      time => timestamps[0] - time <= 60000
    ).length;
  }

  const repeatedReceivers = Object.entries(receiverCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([accountId, count]) => ({
      accountId,
      transactions: count
    }));

  let riskScore = 0;
  const signals = [];

  if (failed > 0) {
    riskScore += 10;

    signals.push({
      type: "FAILED_TRANSACTIONS",
      severity: "NOTICE",
      evidence: `${failed} failed transaction(s) found in the sample. Failed transactions alone do not establish malicious activity.`
    });
  }

  if (burstCount >= 5) {
    signals.push({
      type: "ACTIVITY_BURST",
      severity: "INFO",
      evidence: `${burstCount} transactions occurred within 60 seconds of the newest sampled transaction. High activity alone does not establish malicious behaviour.`
    });
  }

  if (repeatedReceivers.length > 0) {
    signals.push({
      type: "REPEATED_COUNTERPARTIES",
      severity: "INFO",
      evidence: "Some receiver accounts appear repeatedly. This is not proof of malicious activity."
    });
  }

  if (unknownOutcomes > 0) {
    signals.push({
      type: "INCOMPLETE_OUTCOME_DATA",
      severity: "INFO",
      evidence: `${unknownOutcomes} transaction outcomes could not be classified.`
    });
  }

  const riskLevel =
    riskScore >= 40 ? "HIGH" :
    riskScore >= 20 ? "ELEVATED" :
    "LOW";

  return {
    account,
    source: "NearBlocks",

    counterpartyHistory: history.counterparty
      ? analyzeCounterpartyHistory(
          account,
          history.counterparty,
          transactions,
          history
        )
      : null,

    sampledTransactions: transactions.length,
    historyScope: "Up to 100 most recent transactions (5 pages maximum).",
    pagesFetched: history.pagesFetched ?? 1,
    historyLimit: 100,
    hasMoreHistory: history.hasMoreHistory ?? false,

    oldestObservedTransactionInSample: (() => {
      const oldest = transactions
        .map(getTimestamp)
        .filter(value => value !== null)
        .sort((a, b) => a - b)[0];

      return oldest === undefined
        ? null
        : new Date(oldest).toISOString();
    })(),

    oldestObservedDateNote: "This is the oldest transaction found in the sampled pages, not the account creation date or proof of the first-ever transaction.",

    failedTransactions: failed,
    unknownOutcomes,
    transactionsWithin60Seconds: burstCount,
    repeatedReceivers,
    riskScore,
    riskLevel,

    recommendation:
      riskScore >= 40 ? "BLOCK_AND_REVIEW" :
      riskScore >= 20 ? "REVIEW" :
      "MONITOR",

    signals,

    limitations: [
      "This is a heuristic analysis, not proof of malicious activity.",
      "Only up to 100 recent transactions are examined; older history may exist.",
      "No external malicious-account database is checked.",
      "A LOW score does not mean an account is safe."
    ]
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    if (origin && origin !== ALLOWED_ORIGIN) {
      return jsonResponse(
        { error: "Origin not allowed." },
        403,
        origin
      );
    }

    if (request.method !== "GET") {
      return jsonResponse(
        { error: "Method not allowed." },
        405,
        origin
      );
    }

    if (url.pathname === "/health") {
      return jsonResponse({
        status: "online",
        service: "Sentinel AI API"
      }, 200, origin);
    }

    if (!["/transactions", "/analyze"].includes(url.pathname)) {
      return jsonResponse(
        { error: "Endpoint not found." },
        404,
        origin
      );
    }

    const account = (
      url.searchParams.get("account") || ""
    ).trim().toLowerCase();

    if (!validAccount(account)) {
      return jsonResponse(
        { error: "Invalid NEAR account ID." },
        400,
        origin
      );
    }

    if (!env.NEARBLOCKS_API_KEY) {
      return jsonResponse(
        { error: "API configuration unavailable." },
        500,
        origin
      );
    }

    try {
      const nextPage = url.searchParams.get("next");
      const counterparty = (
        url.searchParams.get("counterparty") || ""
      ).trim().toLowerCase();

      if (
        counterparty &&
        (!validAccount(counterparty) || counterparty === account)
      ) {
        return jsonResponse(
          { error: "Invalid counterparty account ID." },
          400,
          origin
        );
      }

      const result = await fetchTransactions(
        account,
        env,
        nextPage
      );

      if (url.pathname === "/transactions") {
        return jsonResponse({
          account,
          source: "NearBlocks",
          cursorReceived: Boolean(nextPage),
          transactions: result.transactions,
          pagination: result.pagination,
          upstreamKeys: result.upstreamKeys,
          rawPagination: result.rawPagination,
          upstreamMeta: result.upstreamMeta
        }, 200, origin);
      }

      const history = await fetchTransactionHistory(
        account,
        env,
        result
      );

      return jsonResponse(
        analyzeTransactions(account, history.transactions, {
          pagesFetched: history.pagesFetched,
          hasMoreHistory: history.hasMoreHistory,
          counterparty
        }),
        200,
        origin
      );

    } catch (error) {
      return jsonResponse({
        error: "Could not retrieve transaction history.",
        reason: error.message.startsWith("NEARBLOCKS_")
          ? error.message
          : "UPSTREAM_ERROR"
      }, 502, origin);
    }
  }
};
