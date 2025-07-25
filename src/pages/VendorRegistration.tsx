import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const VendorRegistration = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessLicense, setBusinessLicense] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      checkExistingVendor();
    }
  }, [user]);

  const checkExistingVendor = async () => {
    if (!user) return;

    try {
      // Check if user is already a vendor
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isVendor = roles?.some(role => role.role === 'vendor');
      
      if (isVendor) {
        navigate("/vendor-dashboard");
      }
    } catch (error) {
      console.error('Error checking vendor status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!user) {
      setError("You must be logged in to register as a vendor");
      setLoading(false);
      return;
    }

    try {
      // First, add vendor role to user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'vendor'
        });

      if (roleError) throw roleError;

      // Then, create vendor profile
      const { error: vendorError } = await supabase
        .from('vendors')
        .insert({
          user_id: user.id,
          business_name: businessName,
          business_license: businessLicense || null,
          description: description || null,
          location: location || null,
          verification_status: 'pending'
        });

      if (vendorError) throw vendorError;

      setSuccess(true);
      
      // Redirect to vendor dashboard after a brief delay
      setTimeout(() => {
        navigate("/vendor-dashboard");
      }, 2000);

    } catch (error: any) {
      console.error('Error registering vendor:', error);
      setError(error.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="text-center pt-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Registration Successful!</h2>
              <p className="text-muted-foreground mb-4">
                Your vendor registration has been submitted for review. You'll be redirected to your dashboard shortly.
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">Become a Vendor</h1>
            <p className="text-lg text-muted-foreground">
              Join AgriConnect and start selling your agricultural products to customers
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vendor Registration</CardTitle>
              <CardDescription>
                Please provide your business information to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name *</Label>
                  <Input
                    id="business-name"
                    type="text"
                    placeholder="Enter your business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-license">Business License (Optional)</Label>
                  <Input
                    id="business-license"
                    type="text"
                    placeholder="Enter your business license number"
                    value={businessLicense}
                    onChange={(e) => setBusinessLicense(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Providing a business license helps with verification
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="Enter your business location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your business and what products you offer"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your registration will be reviewed by our team</li>
                    <li>• Verification typically takes 1-3 business days</li>
                    <li>• You'll receive an email notification once approved</li>
                    <li>• You can then start adding products to your store</li>
                  </ul>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                  variant="agricultural"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register as Vendor
                </Button>
              </form>

              {error && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VendorRegistration;