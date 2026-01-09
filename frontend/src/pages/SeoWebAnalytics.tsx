import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SeoWebAnalytics() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">SEO & Web Analytics</h1>
                            <p className="text-muted-foreground mt-1">Track your website performance and SEO rankings.</p>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>SEO Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">SEO analytics data coming soon.</p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
