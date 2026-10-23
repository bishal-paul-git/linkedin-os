import{NextResponse}from"next/server";
import{cookies}from"next/headers";
import{LinkedInOfficialClient}from"@linkedin-os/linkedin-official";
import{createClient}from"@/lib/supabase/server";

function clearOAuthCookies(res:NextResponse){
  for(const name of ["li_linkedin_oauth_state","li_linkedin_oauth_integration","li_linkedin_oauth_tenant","li_linkedin_oauth_redirect"])res.cookies.delete(name);
  return res;
}

export async function GET(req:Request){
  const u=new URL(req.url),code=u.searchParams.get("code"),state=u.searchParams.get("state");
  const s=await createClient(),{data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.redirect(new URL("/login?next="+encodeURIComponent("/integrations"),u.origin));

  const jar=await cookies();
  const expectedState=jar.get("li_linkedin_oauth_state")?.value;
  const integrationId=jar.get("li_linkedin_oauth_integration")?.value;
  const tenantId=jar.get("li_linkedin_oauth_tenant")?.value;
  const redirectUri=jar.get("li_linkedin_oauth_redirect")?.value??process.env.LINKEDIN_REDIRECT_URI??u.origin+"/auth/linkedin/callback";

  if(!code||!state||!expectedState||state!==expectedState||!integrationId||!tenantId){
    return clearOAuthCookies(NextResponse.redirect(new URL("/integrations?linkedin=oauth_state_error",u.origin)));
  }

  const clientId=process.env.LINKEDIN_CLIENT_ID,clientSecret=process.env.LINKEDIN_CLIENT_SECRET;
  if(!clientId||!clientSecret){
    return clearOAuthCookies(NextResponse.redirect(new URL("/integrations?linkedin=credentials_missing",u.origin)));
  }

  try{
    const client=new LinkedInOfficialClient();
    const token=await client.exchangeCode({clientId,clientSecret,redirectUri,code});
    const member=await client.getUserInfo(token.access_token);
    const expiresAt=token.expires_in?new Date(Date.now()+token.expires_in*1000).toISOString():null;
    const scopes=(token.scope?.split(/\s+/).filter(Boolean)??["openid","profile","email","w_member_social"]);
    const stored=await s.rpc("li_set_oauth_access_token",{
      p_tenant_id:tenantId,
      p_integration_id:integrationId,
      p_access_token:token.access_token,
      p_expires_at:expiresAt,
      p_scopes:scopes,
      p_external_account_id:member.sub,
      p_metadata:{
        oidc_subject:member.sub,
        name:member.name??null,
        email:member.email??null,
        email_verified:member.email_verified??null,
        picture:member.picture??null,
        publishing_ready:false,
        author_urn_verified:false,
      },
    });
    if(stored.error)throw new Error(stored.error.message);
    return clearOAuthCookies(NextResponse.redirect(new URL("/integrations?linkedin=connected_identity_only",u.origin)));
  }catch(error){
    const message=error instanceof Error?error.message:"LinkedIn OAuth failed";
    return clearOAuthCookies(NextResponse.redirect(new URL("/integrations?linkedin="+encodeURIComponent(message),u.origin)));
  }
}
