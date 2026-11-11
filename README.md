Sentinel AI

A security guard for autonomous agents on NEAR Protocol.

Sentinel AI helps prevent unsafe blockchain actions by evaluating transaction risk before an agent signs or executes an operation.

The Problem

Autonomous agents can be manipulated into sending funds to malicious recipients or interacting with unsafe contracts. Once a transaction is signed and broadcast, reversing it may be impossible.

The Solution

Sentinel AI introduces a risk-based authorization layer that evaluates actions and produces one of three decisions:

- ALLOW: The action may proceed.
- WARN: Human approval is required.
- BLOCK: The action must not be signed.

The transaction guard enforces these decisions before invoking the signing function.

Security Architecture

1. Account inspection: Retrieves NEAR account and access-key information.k
2. Risk assessment: Evaluates available security signals.
3. Authorization guard: Applies ALLOW, WARN, and BLOCK decisions.
4. Restricted signing: Demonstrates NEAR FunctionCall access keys limited to specific contracts and methods.
5. Transaction analysis API: Provides heuristic transaction activity analysis through a separate Cloudflare Worker.

NEAR Testnet Demonstration

Sentinel AI has been tested on:

"sentinel-lab-2026.testnet"

A FunctionCall access key was created with these restrictions:

Setting| Value
Network| NEAR Testnet
Contract| sentinel-lab-2026.testnet
Permitted method| "set_message"
Allowance| 1 NEAR
Key type| FunctionCall

Verified results

- The restricted key successfully called "set_message".
- A subsequent read returned "Signed by Sentinel restricted key".
- An attempt to call "new" with the restricted key was rejected because that method was not permitted.

These results demonstrate enforcement of method-level permissions by the NEAR protocol.

Agent Authorization Guard

The guard accepts a risk assessment and a signing callback.

- BLOCK prevents the signing callback from executing.
- WARN requires explicit human approval.
- ALLOW permits the signing callback to execute.

The current guard demonstration uses a simulated signing callback. It is not yet a production wallet integration.

Malicious Agent Attack Simulation

Sentinel AI includes a simulated attack scenario demonstrating how its authorization guard prevents an unsafe transaction from being signed.

Attack scenario:

An untrusted instruction attempts to manipulate an autonomous agent into sending 5 NEAR to an attacker-controlled recipient.

Sentinel's response:

1. The simulated agent presents the attempted transaction.
2. Sentinel evaluates the supplied security signals.
3. The receiver is identified through the malicious blocklist signal.
4. Sentinel returns "BLOCK" with a risk score of 100.
5. The signing callback is never executed.

Verified console output:

SENTINEL DECISION: BLOCK
RISK SCORE: 100
TRANSACTION SIGNED: false
SIGNER CALLED: false
PASS: SENTINEL STOPPED THE ATTACK.

The attack simulation uses a simulated agent and signing callback. It does not execute a real transfer or connect to a live AI agent.

Running the Authorization Tests

The project includes four browser-based authorization tests.

Open the hosted demo and its Eruda console, then run:

import("https://nostrings-cyber.github.io/sentinel-ai./agentGuard.test.js")
  .then(() => console.log("TEST MODULE LOADED"))
  .catch(error => console.error("TEST ERROR:", error));

Expected results:

- PASS: BLOCK prevents signing.
- PASS: WARN requires human approval.
- PASS: WARN proceeds after human approval.
- PASS: ALLOW proceeds without approval.

Successful execution prints:

"SENTINEL AI: ALL 4 TESTS PASSED"

These tests use a simulated signing callback. They do not broadcast real transactions.

Project Components

- "index.html": Browser-based NEAR account inspection interface.
- "sentinel.js": Account inspection and risk assessment logic.
- "agentGuard.js": Transaction authorization wrapper.
- "agentGuard.test.js": Authorization guard tests.
- Cloudflare Worker: Separate transaction-analysis API.

Demo

Hosted interface:

https://nostrings-cyber.github.io/sentinel-ai./

Testnet contract:

"sentinel-lab-2026.testnet"

Current Limitations

Sentinel AI is a hackathon prototype, not a production security product.

- Risk analysis uses heuristics and can produce incomplete assessments.
- The browser interface does not yet provide a complete autonomous-agent wallet integration.
- The signing guard demonstration uses a simulated signer.
- Browser-stored contract fingerprints are not tamper-proof.
- The transaction-analysis API is separate from the browser interface.
- The project has not undergone an independent security audit.

Do not use Sentinel AI as the sole security control for real funds.

Track

NEAR Hackathon 2026
AI Security & Defense

License

See the repository's "LICENSE" file for licensing terms.