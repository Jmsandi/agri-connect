import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  FileText, 
  Camera,
  Save,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const profileSchema = z.object({
  business_name: z.string().min(1, "Business name is required").max(100, "Business name must be less than 100 characters"),
  description: z.string().optional(),
  location: z.string().optional(),
  business_license: z.string().optional(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface VendorData {
  id: string;
  business_name: string;
  description: string | null;
  location: string | null;
  business_license: string | null;
  verification_status: string;
  created_at: string;
}

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
}

interface VendorProfileProps {
  vendorId: string;
  userEmail: string;
}

export const VendorProfile = ({ vendorId, userEmail }: VendorProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      business_name: "",
      description: "",
      location: "",
      business_license: "",
      full_name: "",
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    fetchVendorProfile();
  }, [vendorId]);

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);

      // Fetch vendor data
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (vendorError) throw vendorError;
      setVendor(vendorData);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', vendorData.user_id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }
      setProfile(profileData);

      // Update form with fetched data
      form.reset({
        business_name: vendorData.business_name || "",
        description: vendorData.description || "",
        location: vendorData.location || "",
        business_license: vendorData.business_license || "",
        full_name: profileData?.full_name || "",
        phone: profileData?.phone || "",
        address: profileData?.address || "",
      });

    } catch (error) {
      console.error('Error fetching vendor profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!vendor) return;

    setSaving(true);
    try {
      // Update vendor data
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({
          business_name: data.business_name,
          description: data.description || null,
          location: data.location || null,
          business_license: data.business_license || null,
        })
        .eq('id', vendorId);

      if (vendorError) throw vendorError;

      // Update or insert profile data
      const profileData = {
        user_id: vendor.user_id,
        full_name: data.full_name || null,
        phone: data.phone || null,
        address: data.address || null,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // Update local state
      setVendor({
        ...vendor,
        business_name: data.business_name,
        description: data.description || null,
        location: data.location || null,
        business_license: data.business_license || null,
      });

      setProfile({
        ...profile,
        full_name: data.full_name || null,
        phone: data.phone || null,
        address: data.address || null,
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary">⏳ Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">✗ Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Profile not found
        </h3>
        <p className="text-muted-foreground">
          Unable to load vendor profile data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Profile Settings</h2>
          <p className="text-muted-foreground">
            Manage your vendor profile and business information
          </p>
        </div>
        <Button 
          onClick={fetchVendorProfile} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {vendor.business_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">{vendor.business_name}</h3>
                {getVerificationBadge(vendor.verification_status)}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{userEmail}</span>
              </div>
              {vendor.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{vendor.location}</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Member since {new Date(vendor.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      {vendor.verification_status !== 'verified' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Account Verification</h4>
                <p className="text-sm text-orange-700 mt-1">
                  {vendor.verification_status === 'pending' 
                    ? "Your account is currently under review. This process typically takes 1-3 business days."
                    : "Your account verification was not approved. Please contact support for more information."
                  }
                </p>
                {vendor.verification_status === 'pending' && (
                  <p className="text-xs text-orange-600 mt-2">
                    You can still manage your products, but they won't be visible to customers until verification is complete.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your business information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Business Information */}
              <div>
                <h4 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Business Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="business_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your business name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="business_license"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business License</FormLabel>
                        <FormControl>
                          <Input placeholder="License number (optional)" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your business registration or license number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your business, products, and farming practices..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Tell customers about your farm and what makes your products special
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="City, State/Region" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your farm or business location (helps customers find local produce)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Personal Information */}
              <div>
                <h4 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Your phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Your full address..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Complete address for delivery coordination
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => form.reset()}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
