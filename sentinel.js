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
      throw new Error("NEAR network request failed.");
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
  fullAccess: 0
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

  const keyData = await keyResponse.json();

  if (!keyData.error && keyData.result) {
    keyInfo.total = keyData.result.keys.length;
    keyInfo.fullAccess = keyData.result.keys.filter(
      key => key.access_key.permission === "FullAccess"
    ).length;
  }
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
      message: "Account found. Further security checks are required."
    };

  } catch (error) {
    return {
      status: "ERROR",
      message: "Could not connect to the NEAR network."
    };
  }
}
