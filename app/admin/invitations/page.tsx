import { redirect } from "next/navigation";

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; demo?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.created) query.set("created", params.created);
  if (params.error) query.set("error", params.error);
  if (params.demo) query.set("demo", params.demo);

  redirect(`/admin/client-invitations${query.size ? `?${query.toString()}` : ""}`);
}
