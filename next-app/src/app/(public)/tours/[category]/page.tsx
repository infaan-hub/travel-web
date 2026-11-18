import { redirect } from "next/navigation";
type Params = { params: Promise<{ category: string }> };
export default async function Page(_props: Params) { redirect("/transport/"); }
