import{randomBytes}from"node:crypto";
import{NextResponse}from"next/server";
import{LinkedInOfficialClient}from"@linkedin-os/linkedin-official";
import{createClient}from"@/lib/supabase/server";
import{currentWorkspace}from"@/lib/workspace";

export async function GET(req:Request){
  const u=new URL(req.url),s=await createClient(),{data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.redirect(new URL("/login?next="+encodeURIComponent("/integrations"),u.origin));
  const workspace=await currentWorkspace();
  if(!workspace)return NextResponse.redirect(new URL("/onboarding",u.origin));

  const clientId=process.env.LINKEDIN_CLIENT_ID;
  const clientSecret=process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri=process.env.LINKEDIN_REDIRECT_URI??u.origin+"/auth/linkedin/callback";
  if(!clientId||!clientSecret){
    return NextResponse.redirect(new URL("/integrations?linkedin=credentials_missing",u.origin));
  }

  let integration=(await s.from("li_integrations").select("id").eq("tenant_id",workspace.id).eq("provider","linkedin-official").limit(1).maybeSingle()).data;
  if(!integration){
    const created=await s.from("li_integrations").insert({
      tenant_id:workspace.id,
      provider:"linkedin-official",
      name:"LinkedIn Official",
      status:"DISCONNECTED",
      auth_type:"OAUTH2",
      scopes:["openid","profile","email","w_member_social"],
      metadata:{self_service:true,publishing_ready:false},
    }).select("id").single();
    if(created.error)return NextResponse.redirect(new URL("/integrations?linkedin="+encodeURIComponent(created.error.message),u.origin));
    integration=created.data;
  }

  const state=randomBytes(24).toString("hex");
  const client=new LinkedInOfficialClient();
  const authUrl=client.buildAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    scopes:["openid","profile","email","w_member_social"],
  });

  const res=NextResponse.redirect(authUrl);
  const opts={httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:600};
  res.cookies.set("li_linkedin_oauth_state",state,opts);
  res.cookies.set("li_linkedin_oauth_integration",integration.id,opts);
  res.cookies.set("li_linkedin_oauth_tenant",workspace.id,opts);
  res.cookies.set("li_linkedin_oauth_redirect",redirectUri,opts);
  return res;
}
