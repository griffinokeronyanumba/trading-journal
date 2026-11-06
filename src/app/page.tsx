import { redirect } from "next/navigation";

/** "/" has no content of its own; proxy.ts sends signed-out users to /login. */
export default function Home() {
  redirect("/dashboard");
}
