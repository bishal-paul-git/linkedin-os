import type {
  ProspectDataAdapter,
  ProspectSearchInput,
  ProspectSearchResult,
} from "../../core/src/index.ts";
import { normalizeProspectCandidate, prospectIdentityKey } from "./normalizer.ts";

export class ProspectAdapterRegistry {
  private readonly adapters=new Map<string,ProspectDataAdapter>();

  register(adapter:ProspectDataAdapter):void {
    if(this.adapters.has(adapter.id))throw new Error("Prospect adapter already registered: "+adapter.id);
    this.adapters.set(adapter.id,adapter);
  }

  list():string[] {
    return [...this.adapters.keys()].sort();
  }

  get(id:string):ProspectDataAdapter {
    const adapter=this.adapters.get(id);
    if(!adapter)throw new Error("Unknown prospect adapter: "+id);
    return adapter;
  }

  async search(id:string,input:ProspectSearchInput):Promise<ProspectSearchResult> {
    const adapter=this.get(id);
    const health=await adapter.healthCheck();
    if(!health.ok)throw new Error(health.reason??("Prospect adapter is unavailable: "+id));

    const limit=Math.max(1,Math.min(100,input.limit??25));
    const result=await adapter.search({...input,limit});
    const seen=new Set<string>();
    const candidates=[];

    for(const raw of result.candidates){
      const candidate=normalizeProspectCandidate(raw);
      const key=prospectIdentityKey(candidate);
      if(seen.has(key))continue;
      seen.add(key);
      candidates.push(candidate);
      if(candidates.length>=limit)break;
    }

    return {
      source:result.source||id,
      candidates,
      nextCursor:result.nextCursor??null,
      metadata:result.metadata??{},
    };
  }
}
