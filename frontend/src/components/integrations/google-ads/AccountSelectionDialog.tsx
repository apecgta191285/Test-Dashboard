import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Button } from '../../ui/button';

interface Account {
    id: string;
    name: string;
    status: string;
}

interface AccountSelectionDialogProps {
    isOpen: boolean;
    isLoading: boolean;
    accounts: Account[];
    onSelect: (accountId: string) => void;
    onCancel: () => void;
}

export function AccountSelectionDialog({
    isOpen,
    isLoading,
    accounts,
    onSelect,
    onCancel
}: AccountSelectionDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border">
                {isLoading && accounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <LoadingSpinner size="lg" className="mb-4" />
                        <p className="text-muted-foreground">Loading accounts...</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-lg font-semibold mb-4">Select Google Ads Account</h3>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {accounts.map((account) => (
                                <button
                                    key={account.id}
                                    onClick={() => onSelect(account.id)}
                                    disabled={isLoading}
                                    className="w-full text-left p-3 rounded hover:bg-muted transition-colors border flex justify-between items-center"
                                >
                                    <div>
                                        <div className="font-medium">{account.name}</div>
                                        <div className="text-xs text-muted-foreground">{account.id}</div>
                                    </div>
                                    {account.status === 'ENABLED' ? (
                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Active</span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{account.status}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
