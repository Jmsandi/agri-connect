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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Save,
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface CustomerProfileProps {
  userId: string;
  userEmail: string;
}

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
}

interface DeliveryAddress {
  id: string;
  label: string;
  address: string;
  is_default: boolean;
}

export const CustomerProfile = ({ userId, userEmail }: CustomerProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
  const [newAddress, setNewAddress] = useState({ label: "", address: "" });
  const [showAddAddress, setShowAddAddress] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    fetchProfile();
    fetchDeliveryAddresses();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setProfile(profileData);

      // Update form with fetched data
      if (profileData) {
        form.reset({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
        });
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryAddresses = async () => {
    try {
      // For now, we'll use a simple approach with the main address
      // In a full implementation, you'd have a separate delivery_addresses table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('address')
        .eq('user_id', userId)
        .single();

      if (profileData?.address) {
        setDeliveryAddresses([{
          id: 'default',
          label: 'Default Address',
          address: profileData.address,
          is_default: true,
        }]);
      }
    } catch (error) {
      console.error('Error fetching delivery addresses:', error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      const profileData = {
        user_id: userId,
        full_name: data.full_name,
        phone: data.phone || null,
        address: data.address || null,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: data.full_name,
        phone: data.phone || null,
        address: data.address || null,
      });

      // Refresh delivery addresses
      await fetchDeliveryAddresses();

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

  const addDeliveryAddress = async () => {
    if (!newAddress.label || !newAddress.address) {
      toast({
        title: "Error",
        description: "Please fill in both label and address",
        variant: "destructive",
      });
      return;
    }

    // For now, we'll just update the main address
    // In a full implementation, you'd add to a delivery_addresses table
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ address: newAddress.address })
        .eq('user_id', userId);

      if (error) throw error;

      await fetchDeliveryAddresses();
      setNewAddress({ label: "", address: "" });
      setShowAddAddress(false);

      toast({
        title: "Success",
        description: "Delivery address added successfully",
      });
    } catch (error) {
      console.error('Error adding delivery address:', error);
      toast({
        title: "Error",
        description: "Failed to add delivery address",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Customer Profile</h2>
          <p className="text-muted-foreground">
            Manage your account information and delivery preferences
          </p>
        </div>
        <Button 
          onClick={fetchProfile} 
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
                {profile?.full_name?.charAt(0).toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-semibold">{profile?.full_name || 'Customer'}</h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{userEmail}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.address}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your personal information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
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
                        <Input placeholder="Enter your phone number" {...field} />
                      </FormControl>
                      <FormDescription>
                        For order updates and delivery coordination
                      </FormDescription>
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
                    <FormLabel>Default Delivery Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your delivery address..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This will be used as your default delivery address for orders
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

      {/* Delivery Addresses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Addresses
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddAddress(!showAddAddress)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </CardTitle>
          <CardDescription>
            Manage your delivery addresses for quick checkout
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showAddAddress && (
            <div className="space-y-4 p-4 border rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address-label">Address Label</Label>
                  <Input
                    id="address-label"
                    placeholder="e.g., Home, Office"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address-text">Address</Label>
                <Textarea
                  id="address-text"
                  placeholder="Enter the full address..."
                  rows={3}
                  value={newAddress.address}
                  onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addDeliveryAddress} size="sm">
                  Add Address
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowAddAddress(false);
                    setNewAddress({ label: "", address: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {deliveryAddresses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No delivery addresses added yet
              </p>
            ) : (
              deliveryAddresses.map((address) => (
                <div key={address.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{address.label}</h4>
                      {address.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{address.address}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
