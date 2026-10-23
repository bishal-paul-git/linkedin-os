import{AppShell}from"@/components/app-shell";import{currentUser}from"@/lib/auth";import{currentWorkspace,listWorkspaces}from"@/lib/workspace";
export const dynamic="force-dynamic";
export const preferredRegion="sin1";
export default async function ProductLayout({children}:{children:React.ReactNode}){
  const user=await currentUser();
  if(!user)return children;
  const [workspace,workspaces]=await Promise.all([currentWorkspace(),listWorkspaces()]);
  if(!workspace)return children;
  return <AppShell workspace={workspace} workspaces={workspaces} email={user.email}>{children}</AppShell>;
}