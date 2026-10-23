import{AppShell}from"@/components/app-shell";import{currentUser}from"@/lib/auth";import{currentWorkspace,listWorkspaces}from"@/lib/workspace";import{createClient}from"@/lib/supabase/server";
export const dynamic="force-dynamic";
export const preferredRegion="sin1";
export default async function ProductLayout({children}:{children:React.ReactNode}){
  const user=await currentUser();
  if(!user)return children;
  const [workspace,workspaces]=await Promise.all([currentWorkspace(),listWorkspaces()]);
  if(!workspace)return children;
  const s=await createClient();
  const{count}=await s.from("li_notifications").select("id",{count:"exact",head:true}).eq("tenant_id",workspace.id).eq("status","UNREAD");
  return <AppShell workspace={workspace} workspaces={workspaces} email={user.email} unreadNotifications={count??0}>{children}</AppShell>;
}