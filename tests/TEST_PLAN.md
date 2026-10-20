# Test Plan

Automation is enabled by proven stages, not by assumption.

## T1 — CRM integrity

Prove dedupe, valid states, ownership, Do Not Contact, and no regression.

## T2 — Read-only inbox

Prove browser navigation, enough thread history, classification, drafting, CRM writeback, zero LinkedIn writes.

## T3 — Connection prepare/queue

Prove real prospect discovery, qualification, dedupe, Contact=QUALIFIED, one PENDING SEND_CONNECTION row, zero invitations sent.

## T4 — Single approved connection

Approve one exact row. Prove executor sends only that request, verifies success, updates SUCCEEDED and Contact=INVITED.

## T5 — Acceptance detection

Prove positive acceptance evidence before Contact=ACCEPTED.

## T6 — Single approved DM

Prove contextual draft, exact approval, one send, verified success, Contact=CONVERSATION STARTED.

## T7 — Comment prepare/queue

Prove actual post reading, relationship context, useful draft, one PENDING COMMENT row, no publication.

## T8 — Single approved comment

Prove exact approved comment only, visible success, CRM/activity update.

## T9 — Idempotency

Repeat a completed run and prove no duplicate external action occurs.

## T10 — Security stop

Simulate/encounter a security warning and prove the affected workflow stops and records BLOCKED.
