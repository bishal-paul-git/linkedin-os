# Shared CRM Schema

A Google Sheet is sufficient for V1. The same schema can later move to a database such as Supabase.

## Contacts

`Contact ID | Name | LinkedIn URL | Current Role | Company | Location | Connection Status | Relationship Type | Relationship Owner | Priority | Source | First Discovered | First Interaction | Last Interaction | Next Action | Next Action Date | Do Not Contact | Opportunity Status | Email | Notes`

## Conversations

`Conversation ID | Contact ID | Name | Date | Direction | Category | Priority | Summary | What They Want | What We Want | Question Awaiting Answer | Commitment Made | Requires Reply | Reply Status | Next Action | Next Action Date | Opportunity Signal | Owner Agent | Source URL | Notes`

## Opportunities

`Opportunity ID | Contact ID | Name | Company | Opportunity Type | Problem / Need | Evidence | Potential Solution | Stage | Priority | Owner | Last Interaction | Next Action | Next Action Date | Estimated Value | Meeting Status | Source URL | Notes`

Stages:

`SIGNAL | DISCOVERY | CONVERSATION | MEETING | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST | DORMANT`

## Tasks

`Task ID | Contact ID | Name | Task | Owner Agent | Priority | Status | Due Date | Requires Approval | Approval State | Related Opportunity | Created Date | Completed Date | Source URL | Notes`

Task states:

`TODO | IN PROGRESS | BLOCKED | WAITING | DONE | CANCELLED`

Approval states:

`NOT REQUIRED | PENDING | APPROVED | REJECTED`

## Content & Engagement

`Activity ID | Person / Company | LinkedIn URL | Activity Type | Topic | Relationship Relevance | Objective | Draft / Summary | Approval State | Status | Scheduled / Action Date | Published / Performed Date | Result | Owner Agent | Notes`

## Activity Log

`Timestamp | Agent | Contact ID | Name | Action | Reason | Result | Related Task | Related Opportunity | Source URL | Approval | Notes`

## Config

Recommended fields:

- Owner Name
- Role
- Company
- Company Description
- Services
- Products
- Target Industries
- Target Company Types
- Target Roles
- Target Locations
- Partnership Targets
- Key Topics
- Goals
- Personal Writing Style
- Company Page Voice
- Exclusions
- Default External Action Policy
- Account Safety Rule

## Run Control

Recommended fields:

- System Stage
- LinkedIn External Actions
- CRM Writes
- Browser Mode
- Connection Requests
- DM / Reply Sending
- Comments / Reactions
- Posts / Page Posts
- Stop On Security Warning
- Current Test

## State rules

1. Deduplicate by LinkedIn URL first, then name + current company.
2. Never reset an established relationship to a cold-prospect state.
3. Keep facts separate from inference. Prefix uncertainty with `Inference:`.
4. `Do Not Contact` overrides prospecting and follow-up recommendations.
5. One active owner should exist for each material relationship/task.
