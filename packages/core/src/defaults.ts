import type { Capability } from "./types.ts";

export function defaultCapabilities(tenantId: string): Capability[] {
  const assisted = (
    capability: string,
    reason: string,
  ): Capability => ({
    tenantId,
    capability,
    mode: "AVAILABLE_ASSISTED",
    adapter: "assisted",
    canExecute: false,
    requiresUserAction: true,
    health: "HEALTHY",
    reason,
  });

  return [
    assisted("SEND_CONNECTION", "Prepare and approve the invitation; the user completes the final LinkedIn action until an authorized adapter is connected."),
    assisted("MANAGE_INVITATIONS", "Invitation decisions require the user until an authorized adapter is connected."),
    assisted("SEND_MESSAGE", "Prepare and approve the message; the user completes the final LinkedIn action until an authorized adapter is connected."),
    assisted("WRITE_COMMENT", "Prepare and approve the comment; the user completes the final LinkedIn action until an authorized adapter is connected."),
    assisted("WRITE_REACTION", "Prepare the engagement decision; the user completes the final LinkedIn action until an authorized adapter is connected."),
    assisted("PUBLISH_MEMBER_POST", "Prepare and approve the post; the user publishes it until an authorized adapter is connected."),
    assisted("PUBLISH_PAGE_POST", "Prepare and approve the Page post; the user publishes it until an authorized adapter is connected."),
    assisted("CHECK_CONNECTION_STATE", "The user or an authorized runtime must confirm connection state."),
    assisted("READ_INBOX", "Inbox review requires an authorized runtime or user-provided context."),
    assisted("READ_RELEVANT_POSTS", "Post review requires an authorized runtime or user-provided post context."),
    {
      tenantId,
      capability: "DISCOVER_PROSPECTS",
      mode: "UNAVAILABLE",
      adapter: null,
      canExecute: false,
      requiresUserAction: true,
      health: "UNAVAILABLE",
      reason: "Connect a licensed/authorized prospect data source or provide a candidate list.",
    },
  ];
}
