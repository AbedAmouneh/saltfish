import { redirect, type ActionFunctionArgs } from "react-router";
import { endStaffSession } from "~/lib/staff.server";

export async function action({ request }: ActionFunctionArgs) {
  return endStaffSession(request);
}

export function loader() {
  return redirect("/staff");
}
