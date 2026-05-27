import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot")({
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset-password",
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { setSent(true); toast.success("Check your email for the reset link"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-9 w-9 rounded-xl bg-gradient-health flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" fill="white" />
          </div>
          <span className="font-bold text-lg">VitalFlow</span>
        </Link>

        <h1 className="text-2xl font-bold text-center">Reset password</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          We'll email you a link to choose a new password.
        </p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-border bg-success/10 p-6 text-center text-sm">
            Email sent to <b>{email}</b>. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-health">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send reset link
            </Button>
          </form>
        )}

        <Link to="/auth/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
