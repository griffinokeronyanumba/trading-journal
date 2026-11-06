import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/features/accounts/queries";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([requireUser(), getProfile()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Profile, timezone, sessions, grades and tags." />
      <Card>
        <CardHeader>
          <CardTitle>Profile & preferences</CardTitle>
          <CardDescription>Applies across all accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} email={user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
