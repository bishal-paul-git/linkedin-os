import assert from"node:assert/strict";
import test from"node:test";
import{NotificationAdapterRegistry,type NotificationDeliveryAdapter,type NotificationPayload}from"./index.ts";

const payload:NotificationPayload={
  tenantId:"tenant-1",userId:"user-1",notificationId:"notification-1",
  eventType:"APPROVAL_PENDING",title:"Approval required",body:"Review action",severity:"WARN"
};

function adapter(input:{id:string;channel:"EMAIL"|"DISCORD";healthy?:boolean;sendOk?:boolean;calls?:string[]}):NotificationDeliveryAdapter{
  return{
    id:input.id,
    channel:input.channel,
    async healthCheck(){return input.healthy===false?{ok:false,reason:"offline"}:{ok:true}},
    async send(){input.calls?.push(input.id);return input.sendOk===false?{ok:false,provider:input.id,error:"failed"}:{ok:true,provider:input.id,externalId:"ext-1"}}
  };
}

test("returns waiting state when no adapter is connected",async()=>{
  const registry=new NotificationAdapterRegistry();
  const result=await registry.dispatch("EMAIL",payload);
  assert.equal(result.ok,false);
  assert.equal(result.waitingForAdapter,true);
});

test("skips unhealthy adapter and uses healthy fallback",async()=>{
  const calls:string[]=[];
  const registry=new NotificationAdapterRegistry();
  registry.register(adapter({id:"discord-primary",channel:"DISCORD",healthy:false,calls}));
  registry.register(adapter({id:"discord-fallback",channel:"DISCORD",calls}));
  const result=await registry.dispatch("DISCORD",payload);
  assert.equal(result.ok,true);
  assert.equal(result.adapterId,"discord-fallback");
  assert.deepEqual(calls,["discord-fallback"]);
});

test("rejects duplicate adapter registration",()=>{
  const registry=new NotificationAdapterRegistry();
  registry.register(adapter({id:"email-1",channel:"EMAIL"}));
  assert.throws(()=>registry.register(adapter({id:"email-1",channel:"EMAIL"})),/already registered/);
});
