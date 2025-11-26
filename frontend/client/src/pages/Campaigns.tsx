import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { campaignsAPI } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Edit2, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget?: number;
  spend: number;
  revenue: number;
  conversions: number;
  roas: number;
  createdAt: string;
  externalId?: string;
}

interface FormErrors {
  name?: string;
  platform?: string;
  budget?: string;
  status?: string;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'GOOGLE_ADS',
    budget: '',
    status: 'ACTIVE',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const response = await campaignsAPI.getAll({ search: searchTerm || undefined });
      setCampaigns(response.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load campaigns', {
        description: err.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Campaign name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Campaign name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      errors.name = 'Campaign name must be less than 100 characters';
    }

    if (!formData.platform) {
      errors.platform = 'Platform is required';
    }

    if (formData.budget && parseFloat(formData.budget) < 0) {
      errors.budget = 'Budget must be a positive number';
    }

    if (!formData.status) {
      errors.status = 'Status is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Validation failed', {
        description: 'Please check the form for errors',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await campaignsAPI.create({
        name: formData.name.trim(),
        platform: formData.platform,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
      });

      toast.success('Campaign created successfully', {
        description: `${formData.name} has been added`,
      });

      setFormData({ name: '', platform: 'GOOGLE_ADS', budget: '', status: 'ACTIVE' });
      setFormErrors({});
      setIsCreateDialogOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message;
      toast.error('Failed to create campaign', {
        description: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    if (!validateForm()) {
      toast.error('Validation failed', {
        description: 'Please check the form for errors',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await campaignsAPI.update(editingCampaign.id, {
        name: formData.name.trim(),
        platform: formData.platform,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
      });

      toast.success('Campaign updated successfully', {
        description: `${formData.name} has been updated`,
      });

      setFormData({ name: '', platform: 'GOOGLE_ADS', budget: '', status: 'ACTIVE' });
      setFormErrors({});
      setEditingCampaign(null);
      setIsEditDialogOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message;
      toast.error('Failed to update campaign', {
        description: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await campaignsAPI.delete(id);
      toast.success('Campaign deleted successfully', {
        description: `${name} has been removed`,
      });
      fetchCampaigns();
    } catch (err: any) {
      toast.error('Failed to delete campaign', {
        description: err.response?.data?.message || 'Please try again',
      });
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      platform: campaign.platform,
      budget: campaign.budget?.toString() || '',
      status: campaign.status,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setFormData({ name: '', platform: 'GOOGLE_ADS', budget: '', status: 'ACTIVE' });
    setFormErrors({});
    setIsCreateDialogOpen(false);
  };

  const closeEditDialog = () => {
    setFormData({ name: '', platform: 'GOOGLE_ADS', budget: '', status: 'ACTIVE' });
    setFormErrors({});
    setEditingCampaign(null);
    setIsEditDialogOpen(false);
  };

  // Real-time validation
  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderCampaignForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Campaign Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="Enter campaign name"
          className={formErrors.name ? 'border-destructive' : ''}
        />
        {formErrors.name && (
          <p className="text-sm text-destructive">{formErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="platform">
          Platform <span className="text-destructive">*</span>
        </Label>
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
        {formErrors.platform && (
          <p className="text-sm text-destructive">{formErrors.platform}</p>
        )}
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
        {formErrors.budget && (
          <p className="text-sm text-destructive">{formErrors.budget}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">
          Status <span className="text-destructive">*</span>
        </Label>
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
        {formErrors.status && (
          <p className="text-sm text-destructive">{formErrors.status}</p>
        )}
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Campaigns</h1>
              <p className="text-muted-foreground mt-1">
                Manage your advertising campaigns
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateCampaign}>
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>
                      Add a new campaign to your dashboard
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    {renderCampaignForm()}
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeCreateDialog}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Campaign
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>
                View and manage all your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No campaigns found' : 'No campaigns yet. Create your first campaign!'}
                  </p>
                </div>
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
                                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                  Synced
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{campaign.platform.replace('_', ' ')}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                                campaign.status === 'ENDED' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {campaign.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            ${(campaign.spend || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(campaign.revenue || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(campaign.roas || 0).toFixed(2)}x
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => openEditDialog(campaign)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
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

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <form onSubmit={handleEditCampaign}>
                <DialogHeader>
                  <DialogTitle>Edit Campaign</DialogTitle>
                  <DialogDescription>
                    Update campaign information
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {renderCampaignForm()}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEditDialog}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
