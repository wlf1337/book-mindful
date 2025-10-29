import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Clock, BookOpen } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay } from "date-fns";
import { goalSchema } from "@/lib/validation";

const Goals = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [newGoal, setNewGoal] = useState({ type: "daily_minutes", value: "" });

  useEffect(() => {
    fetchGoals();
    fetchProgress();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reading_goals")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      toast.error("Failed to load goals");
    }
  };

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const ranges = {
        daily_minutes: { start: startOfDay(now), end: endOfDay(now) },
        weekly_minutes: { start: startOfWeek(now), end: now },
        books_per_month: { start: startOfMonth(now), end: now },
        books_per_year: { start: startOfYear(now), end: now },
      };

      const progressData: Record<string, number> = {};

      for (const [goalType, range] of Object.entries(ranges)) {
        if (goalType.includes("minutes")) {
          const { data } = await supabase
            .from("reading_sessions")
            .select("duration_seconds")
            .eq("user_id", user.id)
            .gte("started_at", range.start.toISOString())
            .lte("started_at", range.end.toISOString())
            .not("ended_at", "is", null);

          const totalMinutes = (data || []).reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / 60;
          progressData[goalType] = Math.round(totalMinutes);
        } else {
          const { count } = await supabase
            .from("user_books")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "completed")
            .gte("completed_at", range.start.toISOString());

          progressData[goalType] = count || 0;
        }
      }

      setProgress(progressData);
    } catch (error: any) {
      console.error(error);
    }
  };

  const addGoal = async () => {
    // Validate goal input
    const validation = goalSchema.safeParse({
      goalType: newGoal.type,
      targetValue: parseInt(newGoal.value),
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("reading_goals")
        .upsert({
          user_id: user.id,
          goal_type: validation.data.goalType,
          target_value: validation.data.targetValue,
        });

      if (error) throw error;
      toast.success("Goal saved!");
      setNewGoal({ type: "daily_minutes", value: "" });
      fetchGoals();
    } catch (error: any) {
      toast.error("Failed to save goal");
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("reading_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;
      toast.success("Goal deleted");
      fetchGoals();
    } catch (error: any) {
      toast.error("Failed to delete goal");
    }
  };

  const goalLabels = {
    daily_minutes: "Daily Reading Time",
    weekly_minutes: "Weekly Reading Time",
    books_per_month: "Books per Month",
    books_per_year: "Books per Year",
  };

  const goalIcons = {
    daily_minutes: Clock,
    weekly_minutes: Clock,
    books_per_month: BookOpen,
    books_per_year: Target,
  };

  const goalUnits = {
    daily_minutes: "minutes",
    weekly_minutes: "minutes",
    books_per_month: "books",
    books_per_year: "books",
  };

  return (
    <div className="min-h-screen gradient-warm">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reading Goals</h1>
          <p className="text-muted-foreground">Set and track your reading objectives</p>
        </div>

        <Card className="shadow-book">
          <CardHeader>
            <CardTitle>Add New Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Goal Type</Label>
                <Select value={newGoal.type} onValueChange={(value) => setNewGoal({ ...newGoal, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_minutes">Daily Reading Time</SelectItem>
                    <SelectItem value="weekly_minutes">Weekly Reading Time</SelectItem>
                    <SelectItem value="books_per_month">Books per Month</SelectItem>
                    <SelectItem value="books_per_year">Books per Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input
                  type="number"
                  placeholder="Enter target"
                  value={newGoal.value}
                  onChange={(e) => setNewGoal({ ...newGoal, value: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addGoal} className="w-full">
                  Save Goal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const Icon = goalIcons[goal.goal_type as keyof typeof goalIcons];
            const currentProgress = progress[goal.goal_type] || 0;
            const percentage = Math.min(100, Math.round((currentProgress / goal.target_value) * 100));
            
            return (
              <Card key={goal.id} className="shadow-book">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">
                    {goalLabels[goal.goal_type as keyof typeof goalLabels]}
                  </CardTitle>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{percentage}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {currentProgress} / {goal.target_value} {goalUnits[goal.goal_type as keyof typeof goalUnits]}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteGoal(goal.id)}
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    Delete Goal
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {goals.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No goals set yet</p>
            <p className="text-sm mt-2">Create a goal above to start tracking your progress</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Goals;
