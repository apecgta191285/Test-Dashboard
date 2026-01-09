import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TrendAnalysis() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Trend Analysis</h1>
                            <p className="text-muted-foreground mt-1">Analyze market trends and performance.</p>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Market Trends</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Trend analysis charts coming soon.</p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
