# AI Architecture Strategy and Privacy Guardrails

TimeForge includes smart analytics capabilities (such as Daily Work Summaries, KPI Analyses, Recurring Blocker Tracking, and Payroll Auditing). This document defines the AI provider architecture, compares different integration models, and enforces strict privacy guardrails for production.

---

## 1. Current Architecture Overview

The application utilizes a decoupled, provider-agnostic AI layer:
1. **Source Data Gatherers (`App\Ai\SourceData\*`)**: These query the database and package the necessary context (e.g., time entry logs, KPI lists, scrum comments) into clean structured arrays.
2. **Provider Contract (`App\Ai\AiProvider`)**: Defines the generation contract, passing an `AiOutputType` and the gathered `$sourceData` array.
3. **Stub Provider (`App\Ai\StubAiProvider`)**: The default implementation. It is a local, deterministic engine that generates structured reports using string template mappings. It executes instantly, costs nothing, uses no credentials, and guarantees 100% data privacy.
4. **Audit Logger (`App\Ai\AiSummaryService`)**: Stores the gathered source data array and the final AI completion text in the `ai_outputs` database table. This provides a complete security audit log of what data was accessed.

---

## 2. Provider Comparison Matrix

| Criteria | Local Deterministic Engine (Default) | Cloud LLM API (e.g., OpenAI, Claude, Gemini) | Hybrid Model (Structured + Cloud Formatting) |
| --- | --- | --- | --- |
| **Data Privacy** | **High** (100% local, no data leaves the server) | **Low-Medium** (Data is transmitted to third-party endpoints) | **Medium-High** (Structured locally, masked text sent to API) |
| **Cost** | **Zero** ($0.00 / month) | **Variable** (Costs scale per token/request) | **Variable** (Token costs apply, but size is minimized) |
| **Latency** | **Instant** (Sub-10ms response) | **High** (2–8 seconds per generation) | **High** (External network latency applies) |
| **Factual Accuracy** | **100% Correct** (Strict database query reflection) | **Uncertain** (Risk of hallucination and numerical errors) | **High** (Core statistics are computed locally, API only formats prose) |
| **Generative Fluency** | **Low** (Structured templates and lists) | **High** (Rich, conversational prose) | **Medium-High** (Fluent formatting of fixed facts) |

---

## 3. Production Architecture Recommendation

**We recommend keeping the Local Deterministic Stub active for the production launch.**
* It eliminates all API operating costs and connection latency.
* It guarantees that zero employee data leaves the application's secure infrastructure.
* It meets the strict PRD §7.8 requirement: "AI implementation must not invent business data."

---

## 4. Strict Privacy Guardrails (Cloud Migration Policy)

If the business decides to transition from the local stub to an external Cloud AI API, the development team **must** implement and audit the following privacy rules before going live:

### A. Absolute Data Exclusion (Blocklist)
The following properties must be stripped from all outgoing AI payloads and **never** be sent to an external network:
* **Security Credentials**: User passwords, password hashes, OAuth tokens, session tokens, API keys, and server environment variables.
* **Direct PII**: Email addresses, phone numbers, exact residential addresses, and national identifiers (SSNs, tax IDs).
* **Financial Details**: Hourly wage rates, target salaries, bank account details, and payment histories.

### B. Anonymization & Token Masking
When compiling employee summaries or scrum blockers:
1. **Name Masking**: Real employee names must be mapped to random temporary identifiers (e.g., `Employee_A`, `Supervisor_1`).
2. **Context Scrubbing**: Gathered text descriptions (such as time entry notes or scrum blocker logs) must be parsed to replace detected email strings or numeric digits with placeholder tokens (e.g., `[REDACTED_EMAIL]`).

### C. Provider Configuration Rules
* **No-Training Agreement**: The API connection must be established with an Enterprise-tier endpoint or utilize custom API parameters that guarantee data is used only for real-time inference and is **never** retained for training or model improvement.
* **TLS Security**: All outbound connections to the AI provider API must be forced over secure HTTPS.

### D. Audit Compliance
The existing auditing framework (`ai_outputs` table database writes) must remain active. Every request array sent to the LLM and the raw response returned must be logged for administrator auditing.
