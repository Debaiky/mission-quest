import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require";
import { KidLogin } from "./kid-login";

export const metadata = { title: "Kid log in" };

export default async function KidLoginPage() {
  const ctx = await getSession();
  if (ctx?.role === "CHILD") redirect("/kid");
  if (ctx?.role === "PARENT") redirect("/parent");
  return (
    <div data-theme="sunrise" className="kid-ground flex min-h-screen flex-col">
      <KidLogin />
    </div>
  );
}
