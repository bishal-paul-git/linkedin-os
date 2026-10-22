create index if not exists li_content_engagement_social_post_idx
  on public.li_content_engagement(social_post_id);

create index if not exists li_social_analytics_social_post_idx
  on public.li_social_analytics_snapshots(social_post_id);
