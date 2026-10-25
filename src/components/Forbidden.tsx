import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";

export function Forbidden() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <ShieldAlert className="h-12 w-12 text-destructive" />
      <h1 className="text-5xl font-bold">403</h1>
      <p className="text-muted-foreground">You don't have permission to view this page.</p>
      <Button asChild variant="hero"><Link to="/">Back to shopping</Link></Button>
    </div>
  );
}
