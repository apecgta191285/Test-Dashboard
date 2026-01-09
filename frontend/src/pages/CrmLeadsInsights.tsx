import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CrmLeadsInsights() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">CRM & Leads Insights</h1>
                            <p className="text-muted-foreground mt-1">Track your leads and customer relationships.</p>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Lead Pipeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">CRM data coming soon.</p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
