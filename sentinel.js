const NEAR_RPC = "https://free.rpc.fastnear.com";
const FASTNEAR_RPC = "https://rpc.mainnet.near.org";

export async function inspectNearAccount(accountId) {
  const id = accountId.trim().toLowerCase();

  if (!/^[a-z0-9._-]{2,64}$/.test(id)) {
    return {
      status: "INVALID",
      message: "Invalid account ID format."
    };
  }

  try {
    // 1. Retrieve account information
    const response = await fetch(NEAR_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "sentinel",
        method: "query",
        params: {
          request_type: "view_account",
          finality: "final",
          account_id: id
        }
      })
    });

    if (!response.ok) {
      throw new Error("NEAR account request failed.");
    }

    const data = await response.json();

    if (data.error || !data.result) {
  console.error("Sentinel RPC response:", data);

  return {
    status: "ERROR",
    message: data.error?.message ||
      "RPC returned no account result. Check browser console."
  };
}

    // 2. Retrieve access keys from NEAR RPC
    let keyInfo = {
  total: null,
  fullAccess: null,
  functionCall: null,
  available: false
};

let keyCheckError = "No error";
let independentKeyCheckError = "No error";

    try {
      const keyResponse = await fetch(NEAR_RPC, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "sentinel-keys",
          method: "query",
          params: {
            request_type: "view_access_key_list",
            finality: "final",
            account_id: id,
            limit: 100
          }
        })
      });

      if (!keyResponse.ok) {
        throw new Error("NEAR access-key request failed.");
      }

      const keyData = await keyResponse.json();

      if (keyData.error) {
  throw new Error(
  "NEAR RPC error: " +
  JSON.stringify(keyData.error).slice(0, 500)
);
}

if (!Array.isArray(keyData.result?.keys)) {
  throw new Error(
    "Unexpected NEAR response: " +
    JSON.stringify(keyData.result ?? keyData).slice(0, 300)
  );
}

      const keys = keyData.result.keys;

      keyInfo.total = keys.length;

      keyInfo.fullAccess = keys.filter(
        key => key.access_key?.permission === "FullAccess"
      ).length;

      keyInfo.functionCall = keys.filter(
        key =>
          typeof key.access_key?.permission === "object" &&
          key.access_key.permission?.FunctionCall
      ).length;

      keyInfo.available = true;

    } catch (error) {
  keyCheckError =
    error instanceof Error ? error.message : String(error);

  console.error("NEAR access-key check:", error);
}

    // 3. Independently retrieve access keys from FastNEAR
    let independentKeyInfo = {
      total: null,
      available: false
    };

    try {
      const verifyResponse = await fetch(FASTNEAR_RPC, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "sentinel-verification",
          method: "query",
          params: {
            request_type: "view_access_key_list",
            finality: "final",
            account_id: id
          }
        })
      });

      if (!verifyResponse.ok) {
        throw new Error("FastNEAR request failed.");
      }

      const verifyData = await verifyResponse.json();

      if (
        verifyData.error ||
        !Array.isArray(verifyData.result?.keys)
      ) {
        throw new Error("FastNEAR key data unavailable.");
      }

      independentKeyInfo.total =
        verifyData.result.keys.length;

      independentKeyInfo.available = true;

    } catch (error) {
  independentKeyCheckError =
    error instanceof Error ? error.message : String(error);

  console.error("FastNEAR verification:", error);
}

    // 4. Compare both results
    let verificationStatus = "UNAVAILABLE";

    if (
      keyInfo.available &&
      independentKeyInfo.available
    ) {
      verificationStatus =
        keyInfo.total === independentKeyInfo.total
          ? "MATCH"
          : "MISMATCH";
    }

    // 5. Return results
    return {
      status: "FOUND",
      accountId: id,
      balance: data.result.amount,
      storageUsage: data.result.storage_usage,
      blockHeight: data.result.block_height,

      accessKeyCount: keyInfo.total,
      fullAccessKeyCount: keyInfo.fullAccess,
      functionCallKeyCount: keyInfo.functionCall,
      accessKeyCheckAvailable: keyInfo.available,

      independentAccessKeyCount: independentKeyInfo.total,
      independentAccessKeyCheckAvailable:
        independentKeyInfo.available,

      accessKeyVerification: verificationStatus,
      keyCheckError,
      independentKeyCheckError,

      message: "Account found. Further security checks are required."
    };

  } catch (error) {
    console.log("Account inspection failed:", error);

    return {
      status: "ERROR",
      message: "Could not connect to the NEAR network."
    };
  }
}



export async function analyzeTransactionHistory(
  accountId,
  counterpartyId = ""
) {
  const id = String(accountId || "").trim().toLowerCase();
  const counterparty = String(counterpartyId || "").trim().toLowerCase();

  if (!/^[a-z0-9._-]{2,64}$/.test(id)) {
    return {
      status: "UNKNOWN",
      message: "Invalid account ID."
    };
  }

  if (
    counterparty &&
    (
      !/^[a-z0-9._-]{2,64}$/.test(counterparty) ||
      counterparty === id
    )
  ) {
    return {
      status: "UNKNOWN",
      message: "Invalid counterparty account ID."
    };
  }

  try {
    const url = new URL(
      "https://sentinel-api.strings-alex2.workers.dev/analyze"
    );

    url.searchParams.set("account", id);

    if (counterparty) {
      url.searchParams.set("counterparty", counterparty);
    }

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("API returned HTTP " + response.status);
    }

    const analysis = await response.json();

    return {
      status: "AVAILABLE",
      ...analysis
    };

  } catch (error) {
    console.error("Sentinel transaction analysis:", error);

    return {
      status: "UNKNOWN",
      message: "Transaction history could not be verified."
    };
  }
}

export async function checkMaliciousRecipient(accountId) {
  const id = String(accountId || "").trim().toLowerCase();

  if (!/^[a-z0-9._-]{2,64}$/.test(id)) {
    return {
      status: "UNKNOWN",
      knownMalicious: undefined,
      message: "Invalid recipient account ID."
    };
  }

  try {
    const response = await fetch("./Blocklist.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Shared blocklist request failed.");
    }

    const blocklist = await response.json();

    if (
      blocklist.version !== 1 ||
      !Array.isArray(blocklist.entries)
    ) {
      throw new Error("Shared blocklist format is invalid.");
    }

    const entry = blocklist.entries.find(item =>
      item &&
      typeof item.accountId === "string" &&
      item.accountId.trim().toLowerCase() === id &&
      item.status === "CONFIRMED"
    );

    if (!entry) {
      return {
        status: "CLEAR",
        knownMalicious: false,
        message: "Recipient is not listed in the shared blocklist."
      };
    }

    return {
      status: "BLOCKLISTED",
      knownMalicious: true,
      reason: entry.reason || "Confirmed malicious recipient.",
      evidence: entry.evidence || null,
      reportedAt: entry.reportedAt || null,
      message: "Recipient is listed in the shared malicious blocklist."
    };

  } catch (error) {
    console.error("Sentinel blocklist check failed:", error);

    return {
      status: "UNKNOWN",
      knownMalicious: undefined,
      message: "Shared blocklist could not be verified."
    };
  }
}


export async function testBlocklistIntegration(accountId) {
  const id = String(accountId || "").trim().toLowerCase();

  try {
    const response = await fetch("./test-fixtures/Blocklist.test.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Blocklist request failed.");
    }

    const blocklist = await response.json();

    if (
      blocklist.version !== 1 ||
      !Array.isArray(blocklist.entries)
    ) {
      throw new Error("Invalid blocklist format.");
    }

    const entry = blocklist.entries.find(item =>
      item &&
      typeof item.accountId === "string" &&
      item.accountId.trim().toLowerCase() === id &&
      item.status === "TEST_ONLY"
    );

    if (!entry) {
      return {
        passed: false,
        status: "NO_TEST_FIXTURE",
        message: "No test-only entry found."
      };
    }

    const risk = calculateRiskScore({
      knownMalicious: true,
      suspiciousCodeChange: false,
      unusualActivity: false,
      suspiciousHistory: false,
      riskyAccessKeys: false,
      failedInteractions: false
    });

    return {
      passed: risk.decision === "BLOCK" && risk.score === 100,
      status: "TEST_ONLY",
      accountId: id,
      decision: risk.decision,
      riskScore: risk.score,
      reason: entry.reason,
      message: "Test fixture detected. BLOCK scoring verified."
    };

  } catch (error) {
    return {
      passed: false,
      status: "ERROR",
      message: error.message || "Blocklist test failed."
    };
  }
}

export async function assessRecipientRisk(accountId, signals = {}) {
  const blocklist = await checkMaliciousRecipient(accountId);

  const knownMalicious =
  signals.knownMalicious === true ||
  blocklist.status === "BLOCKLISTED"
    ? true
    : blocklist.status === "CLEAR"
      ? false
      : undefined;

const risk = calculateRiskScore({
  ...signals,
  knownMalicious
});

  return { ...risk, blocklist };
}

export function calculateRiskScore(signals = {}) {
  let score = 0;
  const reasons = [];

  const checks = [
    "knownMalicious",
    "suspiciousCodeChange",
    "unusualActivity",
    "suspiciousHistory",
    "riskyAccessKeys",
    "failedInteractions"
  ];

  const unknownSignals = checks.filter(
    key => typeof signals[key] !== "boolean"
  );

  if (signals.knownMalicious === true) {
    score = 100;
    reasons.push("Receiver is on the malicious blocklist.");
  } else {
    if (signals.suspiciousCodeChange === true) {
      score += 25;
      reasons.push("Suspicious contract code change.");
    }

    if (signals.unusualActivity === true) {
      score += 20;
      reasons.push("Unusual transaction activity.");
    }

    if (signals.suspiciousHistory === true) {
      score += 15;
      reasons.push("Suspicious account history.");
    }

    if (signals.riskyAccessKeys === true) {
      score += 15;
      reasons.push("Risky access-key configuration.");
    }

    if (signals.failedInteractions === true) {
      score += 10;
      reasons.push("Previous failed interactions.");
    }
  }

  score = Math.min(score, 100);

  let decision;

  if (signals.knownMalicious === true || score >= 70) {
    decision = "BLOCK";
  } else if (score >= 30 || unknownSignals.length > 0) {
    decision = "WARN";
  } else {
    decision = "ALLOW";
  }

  if (unknownSignals.length > 0) {
    reasons.push("Some security checks are incomplete.");
  }

  return {
    score,
    decision,
    reasons,
    unknownSignals
  };
}



export async function detectNearContract(accountId) {
  if (!accountId || typeof accountId !== "string") {
    return {
      status: "ERROR",
      message: "Invalid account ID."
    };
  }

  try {
    const response = await fetch(NEAR_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "sentinel-contract-check",
        method: "query",
        params: {
          request_type: "view_code",
          finality: "final",
          account_id: accountId
        }
      })
    });

    if (!response.ok) {
      throw new Error("NEAR contract request failed.");
    }

    const data = await response.json();

    if (data.error) {
      const errorText = JSON.stringify(data.error).toLowerCase();

      if (
        errorText.includes("contract code not found") ||
        errorText.includes("no contract code")
      ) {
        return {
          status: "NO_CONTRACT",
          hasContract: false,
          message: "No deployed contract code found."
        };
      }

      return {
        status: "ERROR",
        message: data.error.message || "NEAR returned an error."
      };
    }

    if (!data.result) {
      throw new Error("Contract information is unavailable.");
    }

    return {
      status: "FOUND",
      hasContract: true,
      codeHash: data.result.hash,
      blockHeight: data.result.block_height,
      message: "Smart contract detected."
    };

  } catch (error) {
    return {
      status: "ERROR",
      message: error.message || String(error)
    };
  }
}

export function compareContractHash(accountId, currentHash) {
  if (!accountId || !currentHash) {
    return {
      status: "ERROR",
      message: "Missing account ID or contract hash."
    };
  }

  const key = "sentinel_contract_" + accountId.toLowerCase();

  try {
    const previousHash = localStorage.getItem(key);

    if (!previousHash) {
      localStorage.setItem(key, currentHash);

      return {
        status: "BASELINE_SET",
        changed: false,
        message: "Initial contract fingerprint recorded."
      };
    }

    if (previousHash !== currentHash) {
      return {
        status: "CHANGED",
        changed: true,
        previousHash,
        currentHash,
        message: "Contract code hash has changed!"
      };
    }

    return {
      status: "UNCHANGED",
      changed: false,
      message: "Contract code matches recorded fingerprint."
    };

  } catch (error) {
    return {
      status: "ERROR",
      message: "Could not access fingerprint storage."
    };
  }
}