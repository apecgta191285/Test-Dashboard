import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { showApiError, showSuccess } from '@/lib/errorHandler';
import { AxiosResponse } from 'axios';
import { PaginatedResponse } from '@/types/api';

interface CrudOptions<T> {
    api: {
        getAll: (params?: any) => Promise<AxiosResponse<PaginatedResponse<T>>>;
        create: (data: any) => Promise<AxiosResponse<T>>;
        update: (id: string, data: any) => Promise<AxiosResponse<T>>;
        delete: (id: string) => Promise<AxiosResponse<any>>;
    };
    entityName: string;
    defaultFormData: any;
    validateForm?: (data: any, editingItem: T | null) => Record<string, string>; // Returns errors object
}

export function useCrudOperations<T extends { id: string; name?: string }>({
    api,
    entityName,
    defaultFormData,
    validateForm,
}: CrudOptions<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(defaultFormData);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const fetchItems = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.getAll({ search: searchTerm || undefined });
            setItems(response.data.data || []);
        } catch (err: any) {
            showApiError(err, `Failed to load ${entityName}s`);
        } finally {
            setIsLoading(false);
        }
    }, [api, entityName, searchTerm]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchItems();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchItems]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm) {
            const errors = validateForm(formData, null);
            if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                toast.error('Validation failed', { description: 'Please check the form for errors' });
                return;
            }
        }

        try {
            setIsSubmitting(true);
            await api.create(formData);
            showSuccess(`${entityName} created successfully`, `${formData.name || 'Item'} has been added`);

            setFormData(defaultFormData);
            setFormErrors({});
            setIsCreateDialogOpen(false);
            fetchItems();
        } catch (err: any) {
            showApiError(err, `Failed to create ${entityName}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        if (validateForm) {
            const errors = validateForm(formData, editingItem);
            if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                toast.error('Validation failed', { description: 'Please check the form for errors' });
                return;
            }
        }

        try {
            setIsSubmitting(true);
            await api.update(editingItem.id, formData);
            showSuccess(`${entityName} updated successfully`, `${formData.name || 'Item'} has been updated`);

            setFormData(defaultFormData);
            setFormErrors({});
            setEditingItem(null);
            setIsEditDialogOpen(false);
            fetchItems();
        } catch (err: any) {
            showApiError(err, `Failed to update ${entityName}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            await api.delete(id);
            showSuccess(`${entityName} deleted successfully`, `${name} has been removed`);
            fetchItems();
        } catch (err: any) {
            showApiError(err, `Failed to delete ${entityName}`);
        }
    };

    const openEditDialog = (item: T, mapItemToForm: (item: T) => any) => {
        setEditingItem(item);
        setFormData(mapItemToForm(item));
        setFormErrors({});
        setIsEditDialogOpen(true);
    };

    const closeDialogs = () => {
        setFormData(defaultFormData);
        setFormErrors({});
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setEditingItem(null);
    };

    const handleFieldChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    return {
        items,
        isLoading,
        searchTerm,
        setSearchTerm,
        isCreateDialogOpen,
        setIsCreateDialogOpen,
        isEditDialogOpen,
        setIsEditDialogOpen,
        editingItem,
        isSubmitting,
        formData,
        setFormData,
        formErrors,
        setFormErrors,
        fetchItems,
        handleCreate,
        handleUpdate,
        handleDelete,
        openEditDialog,
        closeDialogs,
        handleFieldChange,
    };
}
