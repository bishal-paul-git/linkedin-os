# Comment Review

Use LinkedIn Manager + Content + CRM.

## Goal

Find a small quality-first set of LinkedIn posts where a comment would genuinely add value.

## Sources

Prioritize posts from:

- existing prospects;
- potential partners;
- clients;
- important existing contacts;
- approved target accounts;
- relevant people in CRM.

## For each post

1. Read the actual post.
2. Understand the author's point.
3. Check the author/contact in CRM.
4. Review relationship/history and existing engagement.
5. Decide whether Bishal has something specific and useful to add.
6. Reject generic visibility-only opportunities.
7. Draft a short, human, specific comment.
8. Create one Approval Queue row:
   - Action Type = COMMENT
   - exact post URL
   - exact proposed comment
   - specific reason
   - Requested By Agent = COMMENT REVIEW
   - Approval State = PENDING
   - Execution State = NOT_READY
   - stable Idempotency Key

Do not publish during review.

A valid run may queue zero comments.

Stop on LinkedIn security/restriction warnings.
