import type{NotificationChannel,NotificationDeliveryAdapter,NotificationDeliveryResult,NotificationPayload}from"./types.ts";

export interface NotificationDispatchResult extends NotificationDeliveryResult{
  adapterId?:string;
  waitingForAdapter?:boolean;
}

export class NotificationAdapterRegistry{
  private readonly adapters=new Map<string,NotificationDeliveryAdapter>();

  register(adapter:NotificationDeliveryAdapter):void{
    if(this.adapters.has(adapter.id))throw new Error("Notification adapter already registered: "+adapter.id);
    this.adapters.set(adapter.id,adapter);
  }

  list(channel?:NotificationChannel):string[]{
    return [...this.adapters.values()]
      .filter(a=>!channel||a.channel===channel)
      .map(a=>a.id)
      .sort();
  }

  async dispatch(channel:NotificationChannel,payload:NotificationPayload):Promise<NotificationDispatchResult>{
    const candidates=[...this.adapters.values()].filter(a=>a.channel===channel);
    if(!candidates.length){
      return{ok:false,provider:"none",waitingForAdapter:true,error:"No "+channel+" delivery adapter is connected."};
    }

    const failures:string[]=[];
    for(const adapter of candidates){
      const health=await adapter.healthCheck();
      if(!health.ok){
        failures.push(adapter.id+": "+(health.reason??"unhealthy"));
        continue;
      }

      try{
        const result=await adapter.send(payload);
        if(result.ok)return{...result,adapterId:adapter.id};
        failures.push(adapter.id+": "+(result.error??"delivery failed"));
      }catch(error){
        failures.push(adapter.id+": "+(error instanceof Error?error.message:"delivery failed"));
      }
    }

    return{
      ok:false,
      provider:"none",
      error:failures.join("; ")||"No healthy delivery adapter is available.",
      waitingForAdapter:false,
    };
  }
}
