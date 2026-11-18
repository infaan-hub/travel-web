import { redirect } from "next/navigation";
type Params = { params: Promise<{ id: string }> };
export default async function Page({ params }: Params) { const { id } = await params; redirect("/private-hire/" + encodeURIComponent(id) + "/"); }
