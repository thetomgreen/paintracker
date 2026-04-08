import HomeScreen from "@/components/HomeScreen";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const { prompt } = await searchParams;
  return <HomeScreen devMode promptParam={prompt} />;
}
