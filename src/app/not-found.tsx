import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col items-center px-4 py-16 sm:px-6">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl">404 — Not found</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/recommend">Recommender</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
