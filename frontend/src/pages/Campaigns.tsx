import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { campaignService } from '@/services/campaign-service';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormDialog } from '@/components/ui/FormDialog';
import { useCrudOperations } from '@/hooks/useCrudOperations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Campaign } from '@/types/api';

const DEFAULT_FORM_DATA = {
  name: '',
  platform: 'GOOGLE_ADS',
  budget: '',
  status: 'ACTIVE',
};

export default function Campaigns() {
  const {
    items: campaigns,
    isLoading,
    searchTerm,
    setSearchTerm,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isSubmitting,
    formData,
    formErrors,
    handleCreate,
    handleUpdate,
    handleDelete,
    openEditDialog,
    closeDialogs,
    handleFieldChange,
  } = useCrudOperations<Campaign>({
    api: campaignService,
    entityName: 'Campaign',
    defaultFormData: DEFAULT_FORM_DATA,
    validateForm: (data) => {
      const errors: Record<string, string> = {};
      if (!data.name.trim()) errors.name = 'Campaign name is required';
      else if (data.name.length < 3) errors.name = 'Campaign name must be at least 3 characters';
      else if (data.name.length > 100) errors.name = 'Campaign name must be less than 100 characters';

      if (!data.platform) errors.platform = 'Platform is required';
      if (data.budget && parseFloat(data.budget) < 0) errors.budget = 'Budget must be a positive number';
      if (!data.status) errors.status = 'Status is required';

      return errors;
    },
  });

  const renderCampaignForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="Enter campaign name"
          className={formErrors.name ? 'border-destructive' : ''}
        />
        {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="platform">Platform <span className="text-destructive">*</span></Label>
        <Select
          value={formData.platform}
          onValueChange={(value) => handleFieldChange('platform', value)}
        >
          <SelectTrigger className={formErrors.platform ? 'border-destructive' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
            <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
            <SelectItem value="TIKTOK_ADS">TikTok Ads</SelectItem>
            <SelectItem value="LINE_ADS">LINE Ads</SelectItem>
            <SelectItem value="SHOPEE">Shopee</SelectItem>
            <SelectItem value="LAZADA">Lazada</SelectItem>
          </SelectContent>
        </Select>
        {formErrors.platform && <p className="text-sm text-destructive">{formErrors.platform}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget (Optional)</Label>
        <Input
          id="budget"
          type="number"
          step="0.01"
          min="0"
          value={formData.budget}
          onChange={(e) => handleFieldChange('budget', e.target.value)}
          placeholder="Enter budget"
          className={formErrors.budget ? 'border-destructive' : ''}
        />
        {formErrors.budget && <p className="text-sm text-destructive">{formErrors.budget}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
        <Select
          value={formData.status}
          onValueChange={(value) => handleFieldChange('status', value)}
        >
          <SelectTrigger className={formErrors.status ? 'border-destructive' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
          </SelectContent>
        </Select>
        {formErrors.status && <p className="text-sm text-destructive">{formErrors.status}</p>}
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h1>
              <p className="text-sm text-slate-500 mt-1">Manage your advertising campaigns</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          <FormDialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => !open && closeDialogs()}
            title="Create New Campaign"
            description="Add a new campaign to your dashboard"
            onSubmit={handleCreate}
            isSubmitting={isSubmitting}
            submitLabel="Create Campaign"
          >
            {renderCampaignForm()}
          </FormDialog>

          <FormDialog
            open={isEditDialogOpen}
            onOpenChange={(open) => !open && closeDialogs()}
            title="Edit Campaign"
            description="Update campaign information"
            onSubmit={handleUpdate}
            isSubmitting={isSubmitting}
            submitLabel="Save Changes"
          >
            {renderCampaignForm()}
          </FormDialog>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>View and manage all your campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search campaigns..."
                />
              </div>

              {isLoading ? (
                <LoadingSpinner text="" />
              ) : campaigns.length === 0 ? (
                <EmptyState
                  hasSearch={!!searchTerm}
                  searchMessage="No campaigns found"
                  emptyMessage="No campaigns yet. Create your first campaign!"
                />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Spend</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">ROAS</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {campaign.name}
                              {campaign.externalId && (
                                <Badge variant="secondary" className="text-xs h-5 px-1.5">Synced</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{campaign.platform.replace('_', ' ')}</TableCell>
                          <TableCell>
                            <StatusBadge status={campaign.status} />
                          </TableCell>
                          <TableCell className="text-right">${(campaign.spend || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">${(campaign.revenue || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{(campaign.roas || 0).toFixed(2)}x</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => openEditDialog(campaign, (c) => ({
                                  name: c.name,
                                  platform: c.platform,
                                  budget: c.budget?.toString() || '',
                                  status: c.status,
                                }))}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleDelete(campaign.id, campaign.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
