import test from "node:test";
import assert from "node:assert/strict";
import type { ProspectDataAdapter } from "../../core/src/index.ts";
import { ProspectAdapterRegistry } from "./registry.ts";
import { normalizeLinkedInProfileUrl } from "./normalizer.ts";

function adapter(overrides:Partial<ProspectDataAdapter>={}):ProspectDataAdapter {
  return {
    id:"licensed-provider",
    tenantId:"t1",
    healthCheck:async()=>({ok:true}),
    search:async()=>({
      source:"licensed-provider",
      candidates:[
        {name:" Jane Smith ",company:"Acme",linkedInUrl:"linkedin.com/in/jane-smith/?trk=test"},
        {name:"Jane Smith",company:"Acme",linkedInUrl:"https://www.linkedin.com/in/jane-smith"},
        {name:"John Doe",company:"Beta",roleTitle:"Founder"},
      ],
    }),
    ...overrides,
  };
}

test("normalizes LinkedIn profile URLs without tracking data",()=>{
  assert.equal(normalizeLinkedInProfileUrl("linkedin.com/in/jane-smith/?trk=test"),"https://www.linkedin.com/in/jane-smith");
  assert.equal(normalizeLinkedInProfileUrl("https://example.com/in/jane"),null);
});

test("health-checks and deduplicates provider candidates",async()=>{
  const registry=new ProspectAdapterRegistry();
  registry.register(adapter());
  const result=await registry.search("licensed-provider",{limit:25});
  assert.equal(result.candidates.length,2);
  assert.equal(result.candidates[0]?.name,"Jane Smith");
  assert.equal(result.candidates[0]?.linkedInUrl,"https://www.linkedin.com/in/jane-smith");
});

test("bounds provider search limits",async()=>{
  let observed=0;
  const registry=new ProspectAdapterRegistry();
  registry.register(adapter({
    search:async(input)=>{
      observed=input.limit??0;
      return {source:"licensed-provider",candidates:[{name:"One"}]};
    },
  }));
  await registry.search("licensed-provider",{limit:500});
  assert.equal(observed,100);
});

test("blocks an unhealthy provider before search",async()=>{
  let searched=false;
  const registry=new ProspectAdapterRegistry();
  registry.register(adapter({
    healthCheck:async()=>({ok:false,reason:"Provider credential missing"}),
    search:async()=>{searched=true;return{source:"licensed-provider",candidates:[]};},
  }));
  await assert.rejects(()=>registry.search("licensed-provider",{}),/credential missing/);
  assert.equal(searched,false);
});
