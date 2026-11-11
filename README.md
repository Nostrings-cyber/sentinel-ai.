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

1. Account inspection: Retrieves NEAR account and access-key information.
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