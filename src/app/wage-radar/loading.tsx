import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-full max-w-xl" />
        <Skeleton className="h-[360px] w-full" />
      </div>
    </div>
  );
}
