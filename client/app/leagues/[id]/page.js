import LeagueDetailPage from "@/components/league/LeagueDetailPage";

export default async function LeagueDetail({ params }) {
  const { id } = await params;
  return <LeagueDetailPage leagueId={id} />;
}
