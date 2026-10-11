# Roadmap

## V1 — Foundation

- [x] Manager/orchestrator
- [x] Inbox workflow
- [x] Prospecting workflow
- [x] Content workflow
- [x] CRM/memory workflow
- [x] Shared CRM schema
- [x] Run Control
- [x] Approval model
- [x] Browser safety policy

## V1.1 — Controlled automation

- [x] Dedicated Approval Queue
- [x] Approval Queue runtime controls
- [x] Accepted-connection review instructions
- [x] Connection-review instructions
- [x] Connection-review qualification and dedupe rules
- [x] Approval executor contract
- [x] Idempotency-key design
- [ ] Live prospect discovery → qualification → approval queue test
- [ ] Approved connection request → INVITED state test
- [ ] Comment discovery → draft → approval → action
- [ ] Accepted connection → contextual DM draft → approval → send end-to-end test
- [ ] Scheduled read-only review tasks
- [ ] Browser-session recovery tests

## V1.2 — Operations

- [ ] Audit dashboard
- [ ] Error/restriction event log
- [ ] Retry policy for non-LinkedIn infrastructure failures
- [ ] Workflow health checks
- [ ] CRM migration option to Supabase
- [ ] Export/import utilities

## Future

- [ ] Reusable onboarding/config wizard
- [ ] Multi-user/team relationship ownership
- [ ] Company Page workflows
- [ ] Analytics and relationship scoring
- [ ] Packaged native Skills when the target workspace supports them
