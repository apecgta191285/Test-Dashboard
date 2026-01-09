import { toast } from 'sonner';

/**
 * Show a standardized API error toast
 * Handles both string and array error messages from backend
 */
export function showApiError(error: any, defaultMessage: string = 'An error occurred') {
    const errorMsg = error?.response?.data?.message;

    let description: string;
    if (Array.isArray(errorMsg)) {
        description = errorMsg.join(', ');
    } else if (typeof errorMsg === 'string') {
        description = errorMsg;
    } else {
        description = 'Please try again';
    }

    toast.error(defaultMessage, { description });
}

/**
 * Show a success toast with optional description
 */
export function showSuccess(message: string, description?: string) {
    toast.success(message, { description });
}
