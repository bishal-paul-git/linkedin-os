import{AppShell}from"@/components/app-shell";import{currentUser}from"@/lib/auth";import{currentWorkspace}from"@/lib/workspace";
export const dynamic="force-dynamic";
export const preferredRegion="sin1";
export default async function ProductLayout({children}:{children:React.ReactNode}){
  const user=await currentUser();
  if(!user)return children;
  const workspace=await currentWorkspace();
  if(!workspace)return children;
  return <AppShell workspace={workspace} email={user.email}>{children}</AppShell>;
}