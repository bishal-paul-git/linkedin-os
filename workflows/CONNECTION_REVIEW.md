# Canonical Connection Review

Input: tenant Config / target criteria.

Flow:

`discover → relationship_stage=DISCOVERED → dedupe/identity check → qualify → relationship_stage=QUALIFIED → prepare SEND_CONNECTION/PENDING approval row → human decision → executor → verified invitation → network_state=INVITED`

Additional rules:

- Strong Fit and Good Fit only may enter the approval queue automatically.
- `network_state` remains factual. Qualification or approval never changes it to INVITED.
- `relationship_stage` may move to PREPARED when the exact action is ready.
- only verified external success may set `network_state=INVITED`.
- Do Not Contact overrides the workflow.
- identity dedupe uses normalized contact identities, with LinkedIn URL/URN preferred when available.
