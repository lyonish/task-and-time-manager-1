import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Zap } from "lucide-react";

export default function BillingSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your subscription and payment details.
        </p>
      </div>

      {/* Current plan */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Current plan</h2>
            <p className="text-muted-foreground text-sm mt-0.5">You are on the free plan.</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">Free</Badge>
        </div>

        <div className="border-t border-border pt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <span>Members</span><span className="font-medium text-foreground">Up to 5</span>
          <span>Projects</span><span className="font-medium text-foreground">Up to 3</span>
          <span>Storage</span><span className="font-medium text-foreground">1 GB</span>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="border border-border rounded-lg p-6 bg-muted/40 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Zap className="h-4 w-4 text-amber-500" />
          Upgrade to Pro
        </div>
        <p className="text-sm text-muted-foreground">
          Unlock unlimited members, projects, and advanced reporting.
        </p>
        <Button disabled>
          <CreditCard className="mr-2 h-4 w-4" />
          Coming soon
        </Button>
      </div>
    </div>
  );
}
