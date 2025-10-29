import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard = ({ title, value, subtitle, icon: Icon, trend }: StatsCardProps) => {
  return (
    <Card className="shadow-book">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-xl font-bold">{value}</div>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        {trend && (
          <p className={`text-[11px] mt-0.5 ${trend.isPositive ? "text-accent" : "text-destructive"}`}>
            {trend.isPositive ? "+" : ""}{trend.value}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
};
