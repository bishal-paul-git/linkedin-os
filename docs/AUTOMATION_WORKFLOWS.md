# Automation Workflows

These workflows are designed for ChatGPT Work/cloud-browser execution plus the shared CRM.

## 1. Comment workflow

```text
Relevant CRM contacts / target accounts
            |
            v
Review recent LinkedIn posts
            |
            v
Read post + relationship history
            |
            v
Does the user have something useful to add?
        |               |
       no              yes
        |               |
      skip              v
                  Draft comment
                        |
                        v
                 Approval Queue
                        |
                 approved only
                        |
                        v
                  Publish comment
                        |
                        v
                 Update CRM/log
```

Do not comment only for visibility.

## 2. Connection workflow

```text
Config / ICP
     |
     v
Discover people
     |
     v
Qualify fit
     |
     v
Check CRM + connection/history
     |
     v
Reject duplicates / weak fits
     |
     v
Prepare shortlist
     |
     v
Approval Queue
     |
approved only
     |
     v
Send connection request
     |
     v
CRM: INVITED
```

Connection requests should have a genuine professional reason. Do not use approval for one batch as standing permission.

## 3. Accepted-connection follow-up

```text
CRM contacts with status INVITED
              |
              v
Check current LinkedIn connection state
              |
       accepted?
        |     |
       no    yes
        |     |
      keep    v
           CRM: ACCEPTED
              |
              v
     Recover original reason/context
              |
              v
       Determine best next action
              |
              v
         Draft first DM
              |
              v
        Approval Queue
              |
        approved only
              |
              v
            Send
              |
              v
 CRM: CONVERSATION STARTED
```

Do not auto-pitch every accepted connection. Valid next actions can include no message yet or engaging with content first.
