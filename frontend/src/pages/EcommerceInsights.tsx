import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EcommerceInsights() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">E-commerce Insights</h1>
                            <p className="text-muted-foreground mt-1">Detailed insights into your e-commerce performance.</p>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">E-commerce metrics coming soon.</p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
