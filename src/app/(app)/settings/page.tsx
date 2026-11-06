import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/features/accounts/queries";
import { GradesManager } from "@/features/settings/components/grades-manager";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { SessionsManager } from "@/features/settings/components/sessions-manager";
import { TagManager } from "@/features/settings/components/tag-manager";
import { getReferenceLists } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, profile, lists] = await Promise.all([requireUser(), getProfile(), getReferenceLists()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Profile, timezone, sessions, grades and tags." />
      <Card>
        <CardHeader>
          <CardTitle>Profile & preferences</CardTitle>
          <CardDescription>Applies across all accounts.</CardDescription>
        </CardHeader>
        <CardContent><ProfileForm profile={profile} email={user.email} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card id="sessions">
          <CardHeader>
            <CardTitle>Trading sessions</CardTitle>
            <CardDescription>Used to auto-suggest the session from a trade&apos;s entry time.</CardDescription>
          </CardHeader>
          <CardContent><SessionsManager sessions={lists.sessions} timezone={profile.timezone} /></CardContent>
        </Card>
        <Card id="grades">
          <CardHeader>
            <CardTitle>Trade grades</CardTitle>
            <CardDescription>Your execution-quality scale.</CardDescription>
          </CardHeader>
          <CardContent><GradesManager grades={lists.grades} /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card id="mistakes">
          <CardHeader>
            <CardTitle>Mistake tags</CardTitle>
            <CardDescription>Tag mistakes consistently so recurring ones show up in analytics.</CardDescription>
          </CardHeader>
          <CardContent><TagManager table="mistake_tags" tags={lists.mistakes} noun="Mistake" placeholder="e.g. Revenge trade" /></CardContent>
        </Card>
        <Card id="confluences">
          <CardHeader>
            <CardTitle>Confluences</CardTitle>
            <CardDescription>Reasons that support a trade.</CardDescription>
          </CardHeader>
          <CardContent><TagManager table="confluences" tags={lists.confluences} noun="Confluence" placeholder="e.g. Fair value gap" /></CardContent>
        </Card>
        <Card id="setups">
          <CardHeader>
            <CardTitle>Setup types</CardTitle>
            <CardDescription>The pattern you traded.</CardDescription>
          </CardHeader>
          <CardContent><TagManager table="setup_types" tags={lists.setups} noun="Setup" placeholder="e.g. Liquidity sweep + MSS" /></CardContent>
        </Card>
      </div>
    </div>
  );
}
