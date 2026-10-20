# @linkedin-os/server

Server-side orchestration for LinkedIn OS.

Current services:

- tenant bootstrap
- approval decisions
- workflow run lifecycle
- capability-aware execution

The package depends on repository/adapter interfaces rather than a specific API vendor. Supabase is the current storage implementation target; LinkedIn and other external APIs plug in later.
