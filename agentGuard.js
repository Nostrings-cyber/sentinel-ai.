
import { calculateRiskScore } from "./sentinel.js";

export async function guardAndSign({
  signals,
  signTransaction,
  requestHumanApproval
}) {
  // 1. Validate the signing function
  if (typeof signTransaction !== "function") {
    return {
      status: "ERROR",
      signed: false,
      message: "Signing function is missing."
    };
  }

  // 2. Assess transaction risk
  const assessment = calculateRiskScore(signals);

  // 3. BLOCK: Never call the signer
  if (assessment.decision === "BLOCK") {
    return {
      status: "BLOCKED",
      decision: "BLOCK",
      riskScore: assessment.score,
      reasons: assessment.reasons,
      signed: false,
      message: "Transaction blocked by Sentinel AI."
    };
  }

  // 4. WARN: Require human approval
  if (assessment.decision === "WARN") {
    if (typeof requestHumanApproval !== "function") {
      return {
        status: "REQUIRES_APPROVAL",
        decision: "WARN",
        riskScore: assessment.score,
        signed: false,
        message: "Human approval is required."
      };
    }

    let approved = false;

    try {
      approved = await requestHumanApproval(assessment);
    } catch (error) {
      approved = false;
    }

    if (approved !== true) {
      return {
        status: "DENIED",
        decision: "WARN",
        riskScore: assessment.score,
        signed: false,
        message: "Human approval was not granted."
      };
    }
  }

  // 5. ALLOW, or WARN with explicit approval
  try {
    const transaction = await signTransaction();

    return {
      status: "SIGNED",
      decision: assessment.decision,
      riskScore: assessment.score,
      signed: true,
      transaction
    };
  } catch (error) {
    return {
      status: "SIGNING_FAILED",
      decision: assessment.decision,
      signed: false,
      message: error.message || "Transaction signing failed."
    };
  }
}
