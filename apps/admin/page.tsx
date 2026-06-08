'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Metrics {
  totalUsers: number;
  totalOrganizations: number;
  totalAgents: number;
  totalConversations: number;
  totalTokens: number;
  apiCalls: number;
  activeUsers: number;
  revenue: number;
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    // Fetch metrics
    const fetchMetrics = async () => {
      // Mock data
      setMetrics({
        totalUsers: 1250,
        totalOrganizations: 45,
        totalAgents: 320,
        totalConversations: 15420,
        totalTokens: 2850000,
        apiCalls: 32450,
        activeUsers: 890,
        revenue: 12450,
      });
    };
    fetchMetrics();
  }, []);

  const statCards = [
    { title: 'Total Users', value: metrics?.totalUsers || 0, icon: '👥' },
    { title: 'Organizations', value: metrics?.totalOrganizations || 0, icon: '🏢' },
    { title: 'Active Agents', value: metrics?.totalAgents || 0, icon: '🤖' },
    { title: 'Conversations', value: metrics?.totalConversations || 0, icon: '💬' },
    { title: 'Tokens Used', value: metrics?.totalTokens?.toLocaleString() || '0', icon: '🔢' },
    { title: 'API Calls', value: metrics?.apiCalls?.toLocaleString() || '0', icon: '📡' },
    { title: 'Active Users', value: metrics?.activeUsers || 0, icon: '🟢' },
    { title: 'Revenue', value: `$${metrics?.revenue?.toLocaleString() || '0'}`, icon: '💰' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          System-wide analytics and management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <span className="text-2xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all users across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">user{i}@example.com</p>
                      <p className="text-sm text-muted-foreground">Role: USER • Status: Active</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-sm border rounded hover:bg-accent">Edit</button>
                      <button className="px-3 py-1 text-sm border border-red-500 text-red-600 rounded hover:bg-red-50">Suspend</button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Real-time system status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>Database</span>
                  <span className="text-green-600">✓ Healthy</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>Redis Cache</span>
                  <span className="text-green-600">✓ Healthy</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>Qdrant Vector DB</span>
                  <span className="text-green-600">✓ Healthy</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>API Server</span>
                  <span className="text-green-600">✓ Healthy</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>WebSocket Server</span>
                  <span className="text-green-600">✓ Healthy</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
