import "server-only";

import { cookies } from "next/headers";

export const ACTIVE_ACCOUNT_COOKIE = "tj_account";
export const ALL_ACCOUNTS = "all";

/** The account chosen in the top-bar selector ("all" = every account). */
export async function getActiveAccountId(validIds: string[]): Promise<string> {
  const value = (await cookies()).get(ACTIVE_ACCOUNT_COOKIE)?.value;
  return value && validIds.includes(value) ? value : ALL_ACCOUNTS;
}
