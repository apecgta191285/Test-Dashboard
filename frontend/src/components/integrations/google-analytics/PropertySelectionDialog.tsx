import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Button } from '../../ui/button';

interface Property {
    propertyId: string;
    displayName: string;
}

interface PropertySelectionDialogProps {
    isOpen: boolean;
    isLoading: boolean;
    properties: Property[];
    onSelect: (propertyId: string) => void;
    onCancel: () => void;
}

export function PropertySelectionDialog({
    isOpen,
    isLoading,
    properties,
    onSelect,
    onCancel
}: PropertySelectionDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border">
                {isLoading && properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <LoadingSpinner size="lg" className="mb-4" />
                        <p className="text-muted-foreground">Loading properties...</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-lg font-semibold mb-4">Select Google Analytics Property</h3>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {properties.length > 0 ? (
                                properties.map((property) => (
                                    <button
                                        key={property.propertyId}
                                        onClick={() => onSelect(property.propertyId)}
                                        disabled={isLoading}
                                        className="w-full text-left p-3 rounded hover:bg-muted transition-colors border flex justify-between items-center"
                                    >
                                        <div>
                                            <div className="font-medium">{property.displayName}</div>
                                            <div className="text-xs text-muted-foreground">{property.propertyId}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                    No properties found.
                                </div>
                            )}
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
