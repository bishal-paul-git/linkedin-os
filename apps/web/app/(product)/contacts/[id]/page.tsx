import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Empty, toneForStatus } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await requireWorkspace();
  const supabase = await createClient();

  const [
    contactResult,
    identityResult,
    conversationResult,
    taskResult,
    opportunityResult,
    approvalResult,
    contentResult,
    activityResult,
  ] = await Promise.all([
    supabase.from("li_contacts").select("*").eq("tenant_id", workspace.id).eq("id", id).maybeSingle(),
    supabase.from("li_contact_identities").select("id,identity_type,provider,external_id,canonical_value,is_primary,verified_at").eq("tenant_id", workspace.id).eq("contact_id", id).order("is_primary", { ascending: false }),
    supabase.from("li_conversations").select("id,occurred_at,direction,category,priority,summary,requires_reply,reply_status,next_action,opportunity_signal").eq("tenant_id", workspace.id).eq("contact_id", id).order("occurred_at", { ascending: false }).limit(100),
    supabase.from("li_tasks").select("id,task,owner_agent,priority,status,due_at,approval_state,created_at,completed_at").eq("tenant_id", workspace.id).eq("contact_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("li_opportunities").select("id,company,opportunity_type,problem_need,evidence,potential_solution,stage,priority,next_action,next_action_at,estimated_value,currency,updated_at").eq("tenant_id", workspace.id).eq("contact_id", id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("li_approval_queue").select("id,action_type,reason,approval_state,execution_state,created_at,executed_at,result").eq("tenant_id", workspace.id).eq("contact_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("li_content_engagement").select("id,activity_type,topic,objective,draft_summary,approval_state,status,performed_at,created_at,result").eq("tenant_id", workspace.id).eq("contact_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("li_activity_log").select("id,agent,action,reason,result,occurred_at,source_url").eq("tenant_id", workspace.id).eq("contact_id", id).order("occurred_at", { ascending: false }).limit(150),
  ]);

  if (contactResult.error) throw new Error(contactResult.error.message);
  const contact: any = contactResult.data;
  if (!contact) notFound();

  const identities = identityResult.data ?? [];
  const conversations = conversationResult.data ?? [];
  const tasks = taskResult.data ?? [];
  const opportunities = opportunityResult.data ?? [];
  const approvals = approvalResult.data ?? [];
  const content = contentResult.data ?? [];
  const activities = activityResult.data ?? [];

  const timeline = [
    ...conversations.map((x: any) => ({
      id: "conversation:" + x.id,
      at: x.occurred_at,
      type: "Conversation",
      title: x.category,
      body: x.summary,
      status: x.reply_status,
    })),
    ...tasks.map((x: any) => ({
      id: "task:" + x.id,
      at: x.completed_at ?? x.created_at,
      type: "Task",
      title: x.task,
      body: x.owner_agent + " · " + x.priority,
      status: x.status,
    })),
    ...approvals.map((x: any) => ({
      id: "approval:" + x.id,
      at: x.executed_at ?? x.created_at,
      type: "Approval",
      title: x.action_type.replaceAll("_", " "),
      body: x.reason,
      status: x.execution_state,
    })),
    ...content.map((x: any) => ({
      id: "content:" + x.id,
      at: x.performed_at ?? x.created_at,
      type: "Content",
      title: x.activity_type.replaceAll("_", " "),
      body: x.topic ?? x.draft_summary,
      status: x.status,
    })),
    ...activities.map((x: any) => ({
      id: "activity:" + x.id,
      at: x.occurred_at,
      type: x.agent,
      title: x.action.replaceAll("_", " "),
      body: x.reason ?? x.result,
      status: x.result,
    })),
  ]
    .filter((x) => Boolean(x.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 200);

  return (
    <>
      <header className="page-head">
        <div>
          <Link href="/contacts" className="muted">← Contacts</Link>
          <h1 style={{ marginTop: 8 }}>{contact.name}</h1>
          <p>{[contact.role_title, contact.company, contact.location].filter(Boolean).join(" · ") || "Relationship record"}</p>
        </div>
        <div className="row">
          <Badge tone={toneForStatus(contact.network_state)}>{contact.network_state}</Badge>
          <Badge tone={toneForStatus(contact.relationship_stage)}>{contact.relationship_stage}</Badge>
          <Badge tone="info">{contact.priority}</Badge>
        </div>
      </header>

      <div className="grid stats">
        <Card><div className="stat"><span>Conversations</span><strong>{conversations.length}</strong></div></Card>
        <Card><div className="stat"><span>Open tasks</span><strong>{tasks.filter((x:any)=>!["DONE","CANCELLED"].includes(x.status)).length}</strong></div></Card>
        <Card><div className="stat"><span>Opportunities</span><strong>{opportunities.length}</strong></div></Card>
        <Card><div className="stat"><span>Approvals</span><strong>{approvals.length}</strong></div></Card>
        <Card><div className="stat"><span>Timeline events</span><strong>{timeline.length}</strong></div></Card>
      </div>

      <div className="grid two">
        <Card title="Relationship memory">
          <div className="stack">
            <div><strong>Owner</strong><p className="muted">{contact.relationship_owner}</p></div>
            <div><strong>Type</strong><p className="muted">{contact.relationship_type ?? "—"}</p></div>
            <div><strong>Next action</strong><p className="muted">{contact.next_action ?? "—"}</p></div>
            <div><strong>Next action date</strong><p className="muted">{contact.next_action_at ? new Date(contact.next_action_at).toLocaleString() : "—"}</p></div>
            <div><strong>Do Not Contact</strong><p className="muted">{contact.do_not_contact ? "YES" : "NO"}</p></div>
            <div><strong>Notes</strong><p className="muted">{contact.notes ?? "—"}</p></div>
          </div>
        </Card>
        <Card title="Known identities">
          {identities.length ? <div className="list">{identities.map((x:any)=><div className="list-item" key={x.id}><div><strong>{x.identity_type}</strong><p>{x.canonical_value ?? x.external_id}</p><p className="muted">{x.provider ?? "native"}{x.verified_at ? " · verified" : ""}</p></div>{x.is_primary ? <Badge tone="good">PRIMARY</Badge> : null}</div>)}</div> : <Empty title="No normalized identities yet" body="LinkedIn URL/URN, email or provider identities appear here when known."/>}
        </Card>
      </div>

      <div style={{ height: 16 }} />
      <Card title="Relationship timeline">
        {timeline.length ? <div className="list">{timeline.map((x:any)=><div className="list-item" key={x.id}><div><div className="row"><strong>{x.title}</strong><Badge tone="info">{x.type}</Badge>{x.status ? <Badge tone={toneForStatus(x.status)}>{x.status}</Badge> : null}</div><p>{x.body ?? "—"}</p></div><span className="muted">{new Date(x.at).toLocaleString()}</span></div>)}</div> : <Empty title="No timeline events" body="Conversations, tasks, approvals, content and audit activity will appear here automatically."/>}
      </Card>

      <div style={{ height: 16 }} />
      <div className="grid two">
        <Card title="Opportunities">
          {opportunities.length ? <div className="list">{opportunities.map((x:any)=><div className="list-item" key={x.id}><div><strong>{x.opportunity_type ?? x.company ?? "Opportunity"}</strong><p>{x.problem_need ?? x.evidence ?? "—"}</p>{x.next_action ? <p><strong>Next:</strong> {x.next_action}</p> : null}</div><Badge tone={toneForStatus(x.stage)}>{x.stage}</Badge></div>)}</div> : <Empty title="No opportunities" body="Opportunity evidence for this relationship will appear here."/>}
        </Card>
        <Card title="Open approvals">
          {approvals.filter((x:any)=>x.execution_state!=="SUCCEEDED").length ? <div className="list">{approvals.filter((x:any)=>x.execution_state!=="SUCCEEDED").map((x:any)=><div className="list-item" key={x.id}><div><strong>{x.action_type.replaceAll("_"," ")}</strong><p>{x.reason}</p></div><Badge tone={toneForStatus(x.execution_state)}>{x.execution_state}</Badge></div>)}</div> : <Empty title="No open approvals" body="Nothing approval-gated is waiting for this contact."/>}
        </Card>
      </div>
    </>
  );
}
