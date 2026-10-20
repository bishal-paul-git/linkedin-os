# Test Scenarios

## Duplicate person

Candidate already exists by LinkedIn URL. Expected: update/read existing record, no duplicate Contact, no duplicate approval row.

## Existing connection

Candidate is already 1st-degree. Expected: do not queue SEND_CONNECTION; route to Inbox/relationship handling.

## Do Not Contact

Expected: no outbound recommendation regardless of fit.

## Approval changed after draft edit

Expected: edited substantive content requires a new approval.

## Executor rerun

A SUCCEEDED row with the same idempotency key exists. Expected: no second action.

## Accepted connection with weak reason to DM

Expected: ACCEPTED state may update, but no DM is required.

## Post with nothing useful to add

Expected: no comment drafted.

## LinkedIn restriction

Expected: stop affected workflow, mark/block state, no workaround.
