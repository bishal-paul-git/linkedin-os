export type NotificationChannel="EMAIL"|"DISCORD";

export interface NotificationPayload{
  tenantId:string;
  userId:string;
  notificationId:string;
  eventType:string;
  title:string;
  body?:string|null;
  severity:"INFO"|"WARN"|"CRITICAL";
  metadata?:Record<string,unknown>;
}

export interface NotificationDeliveryResult{
  ok:boolean;
  provider:string;
  externalId?:string;
  error?:string;
  metadata?:Record<string,unknown>;
}

export interface NotificationDeliveryAdapter{
  id:string;
  channel:NotificationChannel;
  healthCheck():Promise<{ok:boolean;reason?:string}>;
  send(payload:NotificationPayload):Promise<NotificationDeliveryResult>;
}
