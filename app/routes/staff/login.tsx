import { Form, redirect, useActionData, useNavigation, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { hashIp } from "~/lib/bookings.server";
import { hit } from "~/lib/rate-limit.server";
import { clientIp, getStaffScope, scopeForPassword, startStaffSession } from "~/lib/staff.server";

export async function loader({ request }: LoaderFunctionArgs) {
  if (await getStaffScope(request)) throw redirect("/staff");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  // 10 tries per 15 minutes per connection, so passwords can't be guessed by brute force
  if (!(await hit(`login:${hashIp(clientIp(request))}`, 10, 15))) {
    return { error: "Too many attempts. Wait 15 minutes and try again." };
  }
  const scope = scopeForPassword(String(form.get("password") ?? "").slice(0, 200));
  if (!scope) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return { error: "That password didn't work. Ask your manager for the staff password." };
  }
  return startStaffSession(scope);
}

export default function StaffLogin() {
  const res = useActionData<typeof action>();
  const busy = useNavigation().state !== "idle";
  return (
    <div className="mx-auto grid max-w-sm gap-6 pt-16">
      <h1 className="display text-6xl">Staff login</h1>
      <p className="text-sand">Bookings for Naccache and Faqra. Use the password your manager gave you.</p>
      <Form method="post" className="grid gap-4">
        <label htmlFor="password" className="text-sm font-semibold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
          aria-invalid={res?.error ? true : undefined}
        />
        {res?.error ? (
          <p role="alert" className="text-sm font-semibold text-[#ff8a7e]">
            {res.error}
          </p>
        ) : null}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Checking…" : "Log in"}
        </button>
      </Form>
    </div>
  );
}
