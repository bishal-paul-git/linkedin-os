import Link from"next/link";import type{ReactNode}from"react";import{signOutAction}from"@/app/actions";
const nav=[
["/dashboard","Action Centre"],["/inbox","Inbox"],["/contacts","Contacts"],["/tasks","Tasks"],
["/opportunities","Opportunities"],["/approvals","Approvals"],["/content","Content"],
["/workflows","Workflows"],["/integrations","Integrations"],["/security","Security"],["/settings","Settings"]
];
export function AppShell({children,workspace,email}:{children:ReactNode;workspace:{name:string};email?:string|null}){return <div className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">in</span><div><strong>LinkedIn OS</strong><small>{workspace.name}</small></div></div><nav>{nav.map(([h,l])=><Link key={h} href={h}>{l}</Link>)}</nav><div className="sidebar-foot"><small>{email}</small><form action={signOutAction}><button className="text-button">Sign out</button></form></div></aside><main className="main">{children}</main></div>}