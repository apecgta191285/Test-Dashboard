import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usersAPI } from '@/lib/api';
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

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface FormErrors {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'CLIENT',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await usersAPI.getAll({ search: searchTerm || undefined });
      setUsers(response.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load users', {
        description: err.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const isValidPassword = (password: string): boolean => {
    return password.length >= 6;
  };

  // Form validation
  const validateForm = (isEdit: boolean = false): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }

    // Password validation (required for create, optional for edit)
    if (!isEdit) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (!isValidPassword(formData.password)) {
        errors.password = 'Password must be at least 6 characters';
      }
    } else if (formData.password && !isValidPassword(formData.password)) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    } else if (!['ADMIN', 'MANAGER', 'CLIENT'].includes(formData.role)) {
      errors.role = 'Role must be one of: ADMIN, MANAGER, CLIENT';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(false)) {
      toast.error('Validation failed', {
        description: 'Please check the form for errors',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await usersAPI.create({
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        password: formData.password,
        role: formData.role,
      });
      
      toast.success('User created successfully', {
        description: `${formData.name} has been added`,
      });
      
      setFormData({ email: '', name: '', password: '', role: 'USER' });
      setFormErrors({});
      setIsCreateDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message;
      toast.error('Failed to create user', {
        description: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    if (!validateForm(true)) {
      toast.error('Validation failed', {
        description: 'Please check the form for errors',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const updateData: any = {
        name: formData.name.trim(),
        role: formData.role,
      };
      
      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await usersAPI.update(editingUser.id, updateData);
      
      toast.success('User updated successfully', {
        description: `${formData.name} has been updated`,
      });
      
      setFormData({ email: '', name: '', password: '', role: 'USER' });
      setFormErrors({});
      setEditingUser(null);
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message;
      toast.error('Failed to update user', {
        description: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await usersAPI.delete(id);
      toast.success('User deleted successfully', {
        description: `${name} has been removed`,
      });
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to delete user', {
        description: err.response?.data?.message || 'Please try again',
      });
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setFormData({ email: '', name: '', password: '', role: 'USER' });
    setFormErrors({});
    setIsCreateDialogOpen(false);
  };

  const closeEditDialog = () => {
    setFormData({ email: '', name: '', password: '', role: 'USER' });
    setFormErrors({});
    setEditingUser(null);
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

  const renderUserForm = (isEdit: boolean = false) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          placeholder="user@example.com"
          disabled={isEdit}
          className={formErrors.email ? 'border-destructive' : ''}
        />
        {formErrors.email && (
          <p className="text-sm text-destructive">{formErrors.email}</p>
        )}
        {isEdit && (
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="Enter full name"
          className={formErrors.name ? 'border-destructive' : ''}
        />
        {formErrors.name && (
          <p className="text-sm text-destructive">{formErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Password {isEdit ? '(Optional)' : <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => handleFieldChange('password', e.target.value)}
          placeholder={isEdit ? 'Leave blank to keep current password' : 'Enter password'}
          className={formErrors.password ? 'border-destructive' : ''}
        />
        {formErrors.password && (
          <p className="text-sm text-destructive">{formErrors.password}</p>
        )}
        {!isEdit && (
          <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">
          Role <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.role}
          onValueChange={(value) => handleFieldChange('role', value)}
        >
          <SelectTrigger className={formErrors.role ? 'border-destructive' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="CLIENT">Client</SelectItem>
          </SelectContent>
        </Select>
        {formErrors.role && (
          <p className="text-sm text-destructive">{formErrors.role}</p>
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
              <h1 className="text-3xl font-bold">Users</h1>
              <p className="text-muted-foreground mt-1">
                Manage user accounts and permissions
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateUser}>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    {renderUserForm(false)}
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
                      Add User
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                View and manage all user accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
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
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No users found' : 'No users yet. Add your first user!'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(user.id, user.name)}
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
              <form onSubmit={handleEditUser}>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update user information
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {renderUserForm(true)}
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
