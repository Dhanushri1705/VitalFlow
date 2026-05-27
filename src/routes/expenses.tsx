import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Plus, Target, Bell, Apple, Pill, Stethoscope, Dumbbell, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/expenses")({
  component: () => <AppShell><ExpensesPage /></AppShell>,
});

interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  expense_date: string;
}

const CATEGORIES = [
  { id: "nutrition",     label: "Food / Nutrition", icon: Apple },
  { id: "supplements",   label: "Supplements",      icon: Pill },
  { id: "healthcare",    label: "Healthcare",       icon: Stethoscope },
  { id: "fitness",       label: "Fitness",          icon: Dumbbell },
  { id: "personal_care", label: "Personal Care",    icon: Sparkles },
  { id: "other",         label: "Other",            icon: Wallet },
];

function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<{ monthly_limit: number; alert_threshold: number }>({ monthly_limit: 0, alert_threshold: 80 });
  const [addOpen, setAddOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState("nutrition");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [budgetInput, setBudgetInput] = useState<number | "">("");
  const [alertInput, setAlertInput] = useState<number>(80);

  const load = async () => {
    if (!user) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    const fromDate = monthStart.toISOString().slice(0, 10);
    const [{ data: ex }, { data: bg }] = await Promise.all([
      supabase.from("expenses").select("*").eq("user_id", user.id).gte("expense_date", fromDate).order("expense_date", { ascending: false }),
      supabase.from("budgets").select("monthly_limit,alert_threshold").eq("user_id", user.id).maybeSingle(),
    ]);
    setExpenses((ex as Expense[]) ?? []);
    if (bg) {
      setBudget({ monthly_limit: Number(bg.monthly_limit), alert_threshold: bg.alert_threshold });
      setBudgetInput(Number(bg.monthly_limit));
      setAlertInput(bg.alert_threshold);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const weekFrom = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const todayTotal = expenses.filter((e) => e.expense_date === todayISO).reduce((s, e) => s + Number(e.amount), 0);
  const weekTotal = expenses.filter((e) => e.expense_date >= weekFrom).reduce((s, e) => s + Number(e.amount), 0);
  const monthTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const budgetPct = budget.monthly_limit > 0 ? Math.min(100, Math.round((monthTotal / budget.monthly_limit) * 100)) : 0;
  const overAlert = budget.monthly_limit > 0 && budgetPct >= budget.alert_threshold;

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const handleAdd = async () => {
    if (!user || !name.trim() || !amount || Number(amount) <= 0) {
      toast.error("Enter a name and amount");
      return;
    }
    const { data, error } = await supabase
      .from("expenses")
      .insert({ user_id: user.id, name: name.trim(), amount: Number(amount), category, expense_date: date })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Could not save expense");
      return;
    }
    setExpenses((p) => [data as Expense, ...p]);
    setName(""); setAmount(""); setCategory("nutrition"); setDate(new Date().toISOString().slice(0, 10));
    setAddOpen(false);
    toast.success("Expense added");
  };

  const handleSaveBudget = async () => {
    if (!user || budgetInput === "" || Number(budgetInput) < 0) {
      toast.error("Enter a valid budget");
      return;
    }
    const payload = { user_id: user.id, monthly_limit: Number(budgetInput), alert_threshold: alertInput };
    const { error } = await supabase.from("budgets").upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast.error("Could not save budget");
      return;
    }
    setBudget({ monthly_limit: Number(budgetInput), alert_threshold: alertInput });
    setBudgetOpen(false);
    setAlertOpen(false);
    toast.success("Budget updated");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((p) => p.filter((e) => e.id !== id));
  };

  const isEmpty = expenses.length === 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-health flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Expense Tracker</h1>
            <p className="text-sm text-muted-foreground">Track health & wellness spending</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button>
          <Button onClick={() => setBudgetOpen(true)} variant="outline" className="gap-2"><Target className="h-4 w-4" /> Set Budget</Button>
          <Button onClick={() => setAlertOpen(true)} variant="outline" className="gap-2"><Bell className="h-4 w-4" /> Spending Alert</Button>
        </div>
      </div>

      {overAlert && (
        <div className="rounded-xl bg-warning/15 border border-warning/30 px-4 py-3 text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-warning-foreground" />
          You've used <b>{budgetPct}%</b> of your monthly budget — alert threshold is {budget.alert_threshold}%.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Summary label="Today's Expenses" value={fmt(todayTotal)} accent />
        <Summary label="Weekly Expenses" value={fmt(weekTotal)} />
        <Summary label="Budget Used" value={`${budgetPct}%`} sub={budget.monthly_limit > 0 ? `${fmt(monthTotal)} / ${fmt(budget.monthly_limit)}` : "Set a budget to track"} />
      </div>

      {/* Budget progress widget */}
      <div className="rounded-2xl bg-gradient-card border border-border p-5 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Budget Progress</h3>
          <span className="text-sm text-muted-foreground">
            {budget.monthly_limit > 0 ? `${fmt(monthTotal)} / ${fmt(budget.monthly_limit)}` : `${fmt(monthTotal)} / Set Budget`}
          </span>
        </div>
        <Progress value={budgetPct} className="h-2.5" />
        {budget.monthly_limit === 0 && (
          <p className="text-xs text-muted-foreground mt-2">Set a monthly limit to start tracking budget usage.</p>
        )}
      </div>

      {/* Onboarding for empty state */}
      {isEmpty && (
        <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
          <h3 className="font-semibold mb-1">Get started</h3>
          <p className="text-sm text-muted-foreground mb-4">No expenses recorded yet. A few quick steps to set up:</p>
          <ul className="space-y-2 text-sm mb-5">
            <li className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center">1</span> Add your first expense</li>
            <li className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center">2</span> Set a monthly budget</li>
            <li className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center">3</span> Track your wellness-related spending over time</li>
          </ul>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Suggested categories</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.id !== "other").map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategory(c.id); setAddOpen(true); }}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted px-3 py-1.5 text-sm transition-colors"
                >
                  <c.icon className="h-3.5 w-3.5 text-primary" /> {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expense list */}
      {!isEmpty && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <h3 className="font-semibold mb-3">This month</h3>
          <ul className="divide-y divide-border">
            {expenses.map((e) => {
              const cat = CATEGORIES.find((c) => c.id === e.category) ?? CATEGORIES[CATEGORIES.length - 1];
              const Icon = cat.icon;
              return (
                <li key={e.id} className="py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{cat.label} • {new Date(e.expense_date).toLocaleDateString()}</div>
                  </div>
                  <div className="font-semibold">{fmt(Number(e.amount))}</div>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(e.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add expense dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-muted-foreground">Expense name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Multivitamin" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Amount (₹)</label>
                <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set budget dialog */}
      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Monthly Budget</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-muted-foreground">Monthly limit (₹)</label>
              <Input type="number" min={0} value={budgetInput} onChange={(e) => setBudgetInput(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 5000" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBudgetOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBudget}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spending alert dialog */}
      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Spending Alert</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">Get a warning when monthly spend reaches this percentage of your budget.</p>
            <div>
              <label className="text-xs text-muted-foreground">Alert at (%)</label>
              <Input type="number" min={1} max={100} value={alertInput} onChange={(e) => setAlertInput(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAlertOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBudget}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Summary({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-gradient-card border border-border p-5 shadow-soft">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent ? "text-gradient" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
