import { redirect } from "next/navigation";

// Root page redirects to dashboard (auth middleware handles protection)
export default function RootPage() {
  redirect("/dashboard");
}
