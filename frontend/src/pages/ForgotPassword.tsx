import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Mock API call for now
            await new Promise(resolve => setTimeout(resolve, 1500));
            setIsSubmitted(true);
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
                    <CardDescription>
                        Enter your email address and we'll send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isSubmitted ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full w-fit mx-auto">
                                <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-medium">Check your email</h3>
                                <p className="text-sm text-muted-foreground">
                                    We have sent a password reset link to <strong>{email}</strong>.
                                </p>
                            </div>
                            <Button asChild className="w-full mt-4" variant="outline">
                                <Link href="/login">Back to login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending link...
                                    </>
                                ) : (
                                    'Send reset link'
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
                {!isSubmitted && (
                    <CardFooter>
                        <Button variant="link" className="w-full" asChild>
                            <Link href="/login">
                                <span className="flex items-center gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to login
                                </span>
                            </Link>
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
