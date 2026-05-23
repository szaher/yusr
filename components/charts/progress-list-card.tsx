"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProgressItem {
  label: string;
  value: number;
  max: number;
}

interface ProgressListCardProps {
  title: string;
  items: ProgressItem[];
}

export function ProgressListCard({ title, items }: ProgressListCardProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">—</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${pct >= 60 ? "bg-green-500" : "bg-yellow-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
