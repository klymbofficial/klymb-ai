import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary" className="w-full">{label}</Button>
    </form>
  );
}
