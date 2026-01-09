import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/services/api-client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

interface FacebookAccount {
    id: string;
    name: string;
    account_status: number;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tempToken: string;
    onSuccess: () => void;
}

export function FacebookAccountSelectModal({ open, onOpenChange, tempToken, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    useEffect(() => {
        if (open && tempToken) {
            fetchAccounts();
        }
    }, [open, tempToken]);

    const fetchAccounts = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get(`/auth/facebook/ads/temp-accounts?tempToken=${tempToken}`);
            setAccounts(response.data);
        } catch (error) {
            console.error('Failed to fetch Facebook accounts:', error);
            toast.error('Failed to load ad accounts');
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedAccountId) return;

        try {
            setIsSubmitting(true);
            await apiClient.post('/auth/facebook/ads/complete', {
                tempToken,
                accountId: selectedAccountId,
            });
            toast.success('Facebook Ads account connected successfully');
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to connect account:', error);
            toast.error('Failed to connect account');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Select Ad Account</DialogTitle>
                    <DialogDescription>
                        Choose the Facebook Ad Account you want to connect to this dashboard.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No ad accounts found for this user.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedAccountId === account.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                    onClick={() => setSelectedAccountId(account.id)}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{account.name}</span>
                                        <span className="text-xs text-muted-foreground">ID: {account.id}</span>
                                    </div>
                                    {selectedAccountId === account.id ? (
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-slate-300" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedAccountId || isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect Account
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
