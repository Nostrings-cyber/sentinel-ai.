
const NEAR_RPC = "https://rpc.mainnet.near.org";
const FASTNEAR_RPC = "https://rpc.mainnet.fastnear.com";

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
      return {
        status: "NOT_FOUND",
        message: "Account could not be found on NEAR."
      };
    }

    // 2. Retrieve access keys from NEAR RPC
    let keyInfo = {
      total: null,
      fullAccess: null,
      functionCall: null,
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
        throw new Error("NEAR access-key request failed.");
      }

      const keyData = await keyResponse.json();

      if (
        keyData.error ||
        !Array.isArray(keyData.result?.keys)
      ) {
        throw new Error("NEAR access-key data unavailable.");
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
      console.log("NEAR access-key check:", error);
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
      console.log("FastNEAR verification:", error);
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
