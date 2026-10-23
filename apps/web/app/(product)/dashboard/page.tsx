import Link from"next/link";
import{Card,Stat,Badge,toneForStatus,Empty}from"@/components/ui";
import{dashboardData}from"@/lib/data";
import{currentUser}from"@/lib/auth";
import{currentWorkspace}from"@/lib/workspace";

const demoRuns=[
  {id:"demo-run-1",workflow_code:"CONNECTION_REVIEW",status:"PARTIAL",output_summary:"12 candidates reviewed · 4 strong fits prepared for approval"},
  {id:"demo-run-2",workflow_code:"INBOX_REVIEW",status:"SUCCEEDED",output_summary:"8 conversations reviewed · 2 follow-ups surfaced"},
  {id:"demo-run-3",workflow_code:"DAILY_RUN",status:"SUCCEEDED",output_summary:"Relationship snapshot refreshed"},
];

const demoActivity=[
  {id:"demo-a1",agent:"NETWORK",action:"PROSPECT_QUALIFIED",result:"SUCCEEDED",reason:"Strong ICP fit · UK operations leader"},
  {id:"demo-a2",agent:"INBOX",action:"FOLLOW_UP_IDENTIFIED",result:"SUCCEEDED",reason:"Warm conversation needs a reply"},
  {id:"demo-a3",agent:"CONTENT",action:"COMMENT_DRAFTED",result:"PENDING",reason:"Relevant post from active prospect"},
  {id:"demo-a4",agent:"CRM",action:"OPPORTUNITY_CREATED",result:"SUCCEEDED",reason:"Customer-service automation signal"},
];

function PreviewShell({children}:{children:React.ReactNode}){
  const nav=["Action Centre","Inbox","Contacts","Tasks","Opportunities","Approvals","Content","Analytics","Workflows","Integrations","Security","Settings"];
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">in</span><div><strong>LinkedIn OS</strong><small>Public preview</small></div></div>
      <nav>{nav.map((label)=><Link key={label} href={label==="Action Centre"?"/dashboard":"/login?message=Sign%20in%20to%20open%20the%20full%20workspace"}>{label}</Link>)}</nav>
      <div className="sidebar-foot"><Badge tone="info">DEMO DATA</Badge><Link href="/login">Sign in / Create account</Link></div>
    </aside>
    <main className="main">{children}</main>
  </div>;
}

function DashboardView({preview=false,d}:{preview?:boolean;d:any}){
  return <>
    <header className="page-head">
      <div>
        <h1>Action Centre</h1>
        <p>Relationships, approvals, opportunities, workflows and blockers in one place.</p>
      </div>
      {preview?<div className="row"><Badge tone="info">PUBLIC PREVIEW</Badge><Link className="btn" href="/login">Open workspace</Link></div>:null}
    </header>
    {preview?<div className="callout" style={{marginBottom:18}}>This is a safe demo using sample data. No private LinkedIn, Zernio, CRM or Supabase tenant data is exposed.</div>:null}
    <div className="grid stats">
      <Card><Stat label="Contacts" value={d.counts.contacts} hint="relationship memory"/></Card>
      <Card><Stat label="Pending approvals" value={d.counts.approvals} hint="needs a decision"/></Card>
      <Card><Stat label="Opportunities" value={d.counts.opportunities} hint="commercial signals"/></Card>
      <Card><Stat label="Open tasks" value={d.counts.tasks} hint="next actions"/></Card>
      <Card><Stat label="Security" value={d.counts.security} hint="unresolved events"/></Card>
    </div>
    <div className="grid two">
      <Card title="Recent workflow runs">
        {d.runs.length?<div className="list">{d.runs.map((r:any)=><div className="list-item" key={r.id}><div><strong>{r.workflow_code.replaceAll("_"," ")}</strong><p>{r.output_summary??"Waiting for processor"}</p></div><Badge tone={toneForStatus(r.status)}>{r.status}</Badge></div>)}</div>:<Empty title="No workflow runs yet" body="Run a workflow or add a schedule."/>}
      </Card>
      <Card title="Recent activity">
        {d.activity.length?<div className="list">{d.activity.map((a:any)=><div className="list-item" key={a.id}><div><strong>{a.action.replaceAll("_"," ")}</strong><p>{a.agent} · {a.reason??a.result}</p></div><Badge tone={toneForStatus(a.result)}>{a.result}</Badge></div>)}</div>:<Empty title="No activity yet" body="Activity appears as agents and workflows make progress."/>}
      </Card>
    </div>
    {preview?<><div style={{height:16}}/><div className="grid two"><Card title="What the full workspace includes"><div className="list">{["Inbox & relationship memory","Contact timelines","Opportunity pipeline","Approval Queue","LinkedIn analytics","Zernio integrations","Workflow schedules","Run Control & security"].map((x)=><div className="list-item" key={x}><strong>{x}</strong><Badge tone="good">BUILT</Badge></div>)}</div></Card><Card title="Execution model"><div className="stack"><div className="callout"><strong>Research → Memory → Workflow → Approval → Capability Resolver → Execution → Audit</strong></div><p className="muted">Restricted LinkedIn actions remain assisted or blocked unless an approved provider/API is available.</p><Link className="btn" href="/login">Create workspace</Link></div></Card></div></>:null}
  </>;
}

export default async function Dashboard(){
  const user=await currentUser();
  if(!user){
    const demo={counts:{contacts:128,approvals:7,opportunities:11,tasks:16,security:0},runs:demoRuns,activity:demoActivity};
    return <PreviewShell><DashboardView preview d={demo}/></PreviewShell>;
  }
  const workspace=await currentWorkspace();
  if(!workspace){
    const demo={counts:{contacts:0,approvals:0,opportunities:0,tasks:0,security:0},runs:[],activity:[]};
    return <PreviewShell><DashboardView preview d={demo}/></PreviewShell>;
  }
  const d=await dashboardData(workspace.id);
  return <DashboardView d={d}/>;
}
