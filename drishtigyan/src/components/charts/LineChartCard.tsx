import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartCardProps {
  title?: string;
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  className?: string;
}

export function LineChartCard({ title, data, xKey, yKey, className }: LineChartCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      {title ? <h3 className="text-lg font-heading font-semibold text-text-primary mb-4">{title}</h3> : null}
      <div className="h-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Tooltip
              contentStyle={{ backgroundColor: '#0F1629', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#818cf8' }}
            />
            <XAxis dataKey={xKey} stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <Line type="monotone" dataKey={yKey} stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
