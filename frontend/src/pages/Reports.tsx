import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Reports() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Reports & Automation</h1>
                            <p className="text-muted-foreground mt-1">View and schedule your reports.</p>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Available Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Reporting features coming soon.</p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
