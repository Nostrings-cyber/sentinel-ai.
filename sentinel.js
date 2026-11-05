const NEAR_RPC = "https://rpc.mainnet.near.org";

export async function inspectNearAccount(accountId) {
  const id = accountId.trim().toLowerCase();

  if (!/^[a-z0-9._-]{2,64}$/.test(id)) {
    return {
      status: "INVALID",
      message: "Invalid account ID format."
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

    if (data.error) {
      return {
        status: "NOT_FOUND",
        message: "Account could not be found on NEAR."
      };
    }
    let keyInfo = {
  total: 0,
  fullAccess: 0,
  functionCall: 0,
  available: false
};

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
        account_id: id
      }
    })
  });

  if (!keyResponse.ok) {
    throw new Error("Access-key request failed.");
  }


  const keyData = await keyResponse.json();

  if (keyData.error || !Array.isArray(keyData.result?.keys)) {
    throw new Error("Access-key data unavailable.");
  }

  const keys = keyData.result.keys;

  keyInfo.total = keys.length;

  keyInfo.fullAccess = keys.filter(
    key => key.access_key?.permission === "FullAccess"
  ).length;

  keyInfo.functionCall = keys.filter(
    key => typeof key.access_key?.permission === "object" &&
      key.access_key.permission?.FunctionCall
  ).length;

  keyInfo.available = true;

} catch (error) {
  console.log("Access-key check unavailable:", error);
}
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
      message: "Account found. Further security checks are required."
    };

  } catch (error) {
    return {
      status: "ERROR",
      message: "Could not connect to the NEAR network."
    };
  }
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

  let decision = "ALLOW";

  if (score >= 70) {
    decision = "BLOCK";
  } else if (score >= 30 || unknownSignals.length > 0) {
    decision = "WARN";
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
  const NEAR_RPC = "https://rpc.mainnet.near.org";

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

    const data = await response.json();

    if (data.error) {
      const errorText = JSON.stringify(data.error);

      if (
  errorText.toLowerCase().includes("contract code not found") ||
  errorText.toLowerCase().includes("no contract code")
) {
        return {
          status: "NO_CONTRACT",
          hasContract: false,
          message: "No deployed contract code found."
        };
      }

      return {
        status: "ERROR",
        message: "NEAR RPC could not verify contract code."
      };
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
      message: "Could not connect to NEAR RPC."
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