import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';

const Analytics = () => {
  // Mock analytics data
  const commonSymptoms = [
    { symptom: 'Anxiety', count: 15, percentage: 30 },
    { symptom: 'Headache', count: 12, percentage: 24 },
    { symptom: 'Fatigue', count: 10, percentage: 20 },
    { symptom: 'Insomnia', count: 8, percentage: 16 },
    { symptom: 'Back Pain', count: 5, percentage: 10 },
  ];

  const weeklyStats = [
    { day: 'Mon', consultations: 8, aiChats: 15 },
    { day: 'Tue', consultations: 12, aiChats: 20 },
    { day: 'Wed', consultations: 10, aiChats: 18 },
    { day: 'Thu', consultations: 15, aiChats: 25 },
    { day: 'Fri', consultations: 14, aiChats: 22 },
    { day: 'Sat', consultations: 6, aiChats: 10 },
    { day: 'Sun', consultations: 4, aiChats: 8 },
  ];

  const metrics = [
    { title: 'Total Patients', value: '124', change: '+12%', icon: Users, color: 'text-primary' },
    { title: 'Consultations This Week', value: '69', change: '+8%', icon: Activity, color: 'text-secondary' },
    { title: 'AI Chat Sessions', value: '118', change: '+15%', icon: BarChart3, color: 'text-info' },
    { title: 'Patient Satisfaction', value: '4.8/5', change: '+0.2', icon: TrendingUp, color: 'text-success' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Insights into patient care and system usage</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                </div>
                <div className="text-right">
                  <metric.icon className={`h-8 w-8 ${metric.color} mb-2`} />
                  <span className="text-sm text-success">{metric.change}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Common Symptoms Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Most Common Symptoms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commonSymptoms.map((item, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium">{item.symptom}</div>
                <div className="flex-1 bg-muted rounded-full h-4 relative overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <div className="w-16 text-sm text-muted-foreground text-right">
                  {item.count} ({item.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2 text-center">
              {weeklyStats.map((day, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{day.day}</div>
                  <div className="space-y-1">
                    {/* Consultations Bar */}
                    <div className="relative">
                      <div className="bg-muted rounded h-2"></div>
                      <div 
                        className="bg-primary rounded h-2 absolute top-0 left-0 transition-all duration-500"
                        style={{ width: `${(day.consultations / 20) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-primary">{day.consultations}</div>
                    
                    {/* AI Chats Bar */}
                    <div className="relative">
                      <div className="bg-muted rounded h-2"></div>
                      <div 
                        className="bg-secondary rounded h-2 absolute top-0 left-0 transition-all duration-500"
                        style={{ width: `${(day.aiChats / 30) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-secondary">{day.aiChats}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded"></div>
                <span>Consultations</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-secondary rounded"></div>
                <span>AI Chats</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Age Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { range: '18-30', count: 28, color: 'bg-primary' },
                { range: '31-45', count: 45, color: 'bg-secondary' },
                { range: '46-60', count: 32, color: 'bg-info' },
                { range: '60+', count: 19, color: 'bg-warning' },
              ].map((group, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{group.range}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-muted rounded-full h-2 relative">
                      <div 
                        className={`h-2 rounded-full ${group.color} transition-all duration-500`}
                        style={{ width: `${(group.count / 50) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{group.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">2.4 min</div>
                <div className="text-sm text-muted-foreground">Average Response Time</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>&lt; 1 min</span>
                  <span className="text-success">45%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>1-5 min</span>
                  <span className="text-warning">35%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>&gt; 5 min</span>
                  <span className="text-destructive">20%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;