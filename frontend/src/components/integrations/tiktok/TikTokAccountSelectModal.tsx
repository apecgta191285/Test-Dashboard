import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { integrationService, TikTokAccount } from '@/services/integration-service';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Circle, Music2 } from 'lucide-react';

interface TikTokAccountSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tempToken: string;
    onSuccess: () => void;
}

/**
 * TikTok Account Selection Modal
 * 
 * Displayed after OAuth callback when user has multiple advertiser accounts.
 * Follows the same pattern as FacebookAccountSelectModal.
 */
export function TikTokAccountSelectModal({
    open,
    onOpenChange,
    tempToken,
    onSuccess
}: TikTokAccountSelectModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && tempToken) {
            fetchAccounts();
        }
    }, [open, tempToken]);

    const fetchAccounts = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await integrationService.getTikTokTempAccounts(tempToken);

            if (response.data?.accounts) {
                setAccounts(response.data.accounts);

                // Auto-select if only one account
                if (response.data.accounts.length === 1) {
                    setSelectedAccountId(response.data.accounts[0].id);
                }
            } else {
                setAccounts([]);
            }
        } catch (err: any) {
            console.error('Failed to fetch TikTok accounts:', err);
            const errorMessage = err.response?.data?.message || 'Failed to load advertiser accounts';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedAccountId) {
            toast.error('Please select an account');
            return;
        }

        try {
            setIsSubmitting(true);

            const response = await integrationService.completeTikTokConnection(tempToken, selectedAccountId);

            if (response.data?.success) {
                const accountName = response.data.accountName || 'TikTok Ads';
                toast.success(`${accountName} connected successfully`);
                onSuccess();
                onOpenChange(false);
            } else {
                throw new Error('Connection failed');
            }
        } catch (err: any) {
            console.error('Failed to connect TikTok account:', err);
            const errorMessage = err.response?.data?.message || 'Failed to connect account';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setSelectedAccountId(null);
        setAccounts([]);
        setError(null);
        onOpenChange(false);
    };

    const getStatusBadge = (status?: string) => {
        if (!status) return null;

        const statusLower = status.toLowerCase();
        if (statusLower === 'active' || statusLower === 'enable') {
            return (
                <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
                    Active
                </Badge>
            );
        }
        if (statusLower === 'disable' || statusLower === 'inactive') {
            return (
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-xs">
                    Inactive
                </Badge>
            );
        }
        return null;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-900">
                            <Music2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle>Select TikTok Advertiser</DialogTitle>
                            <DialogDescription className="mt-1">
                                Choose the advertiser account to connect to your dashboard.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            <p className="text-sm text-slate-500">Loading accounts...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-red-600 mb-4">{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchAccounts}>
                                Try Again
                            </Button>
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No advertiser accounts found.</p>
                            <p className="text-xs mt-2 text-slate-400">
                                Please ensure your TikTok account has access to at least one advertiser.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedAccountId === account.id
                                            ? 'border-slate-900 bg-slate-50 shadow-sm'
                                            : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                    onClick={() => setSelectedAccountId(account.id)}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-slate-900">
                                                {account.name}
                                            </span>
                                            {getStatusBadge(account.status)}
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">
                                            ID: {account.id}
                                        </span>
                                    </div>
                                    {selectedAccountId === account.id ? (
                                        <CheckCircle2 className="h-5 w-5 text-slate-900 flex-shrink-0" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedAccountId || isSubmitting || isLoading}
                        className="bg-slate-900 hover:bg-slate-800"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect Account
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
