import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, Eye, User, Building, MapPin, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PendingVendor {
  id: string;
  business_name: string;
  description: string | null;
  location: string | null;
  business_license: string | null;
  verification_status: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

export const AdminVerification = () => {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    fetchPendingVendors();
  }, []);

  const fetchPendingVendors = async () => {
    try {
      console.log('Fetching vendors...');
      setDebugInfo("Starting vendor fetch...");

      // Check current user and roles first
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);

      if (!user) {
        throw new Error('No authenticated user');
      }

      // Check user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      console.log('User roles:', { roles, rolesError });
      setDebugInfo(`User: ${user.email}, Roles: ${roles?.map(r => r.role).join(', ') || 'none'}`);

      // Try to fetch vendors
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Vendors query result:', { data, error });

      if (error) {
        console.error('Vendors query error:', error);
        setDebugInfo(`Error: ${error.message} (Code: ${error.code})`);
        throw error;
      }

      // Transform data to match expected interface
      const vendorsWithProfiles = (data || []).map((vendor) => ({
        ...vendor,
        profiles: {
          full_name: null,
          phone: null,
          email: 'Email not available',
        },
      }));

      console.log('Processed vendors:', vendorsWithProfiles);
      setVendors(vendorsWithProfiles);
      setDebugInfo(`Successfully loaded ${vendorsWithProfiles.length} vendors`);
    } catch (error: any) {
      console.error('Error fetching pending vendors:', error);
      setDebugInfo(`Error: ${error.message}`);
      toast({
        title: "Error",
        description: `Failed to load vendors: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateVerificationStatus = async (vendorId: string, status: 'verified' | 'rejected', reason?: string) => {
    try {
      const updateData: any = {
        verification_status: status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'rejected' && reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendorId);

      if (error) throw error;

      // Update local state
      setVendors(vendors.map(vendor => 
        vendor.id === vendorId 
          ? { ...vendor, verification_status: status }
          : vendor
      ));

      toast({
        title: "Success",
        description: `Vendor ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      });

      setSelectedVendor(null);
      setRejectionReason("");
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary">⏳ Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">✗ Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Vendor Verification</h2>
          <p className="text-muted-foreground">
            Review and verify pending vendor applications
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchPendingVendors} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>Debug:</strong> {debugInfo}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications ({vendors.filter(v => v.verification_status === 'pending').length})</CardTitle>
          <CardDescription>
            Vendors waiting for account verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                All caught up!
              </h3>
              <p className="text-muted-foreground">
                No pending vendor verifications at the moment.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vendor.business_name}</p>
                        {vendor.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {vendor.location}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{vendor.profiles?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{vendor.profiles?.email}</p>
                        {vendor.profiles?.phone && (
                          <p className="text-xs text-muted-foreground">{vendor.profiles.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(vendor.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(vendor.verification_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedVendor(vendor)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Vendor Application Review</DialogTitle>
                              <DialogDescription>
                                Review vendor details and make verification decision
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedVendor && (
                              <div className="space-y-6">
                                {/* Business Information */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                                    <p className="font-medium">{selectedVendor.business_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedVendor.verification_status)}
                                    </div>
                                  </div>
                                </div>

                                {selectedVendor.description && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                                    <p className="mt-1 text-sm">{selectedVendor.description}</p>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                                    <p>{selectedVendor.location || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Business License</label>
                                    <p>{selectedVendor.business_license || 'Not provided'}</p>
                                  </div>
                                </div>

                                {/* Contact Information */}
                                <div>
                                  <h4 className="font-medium mb-2">Contact Information</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                      <p>{selectedVendor.profiles?.full_name || 'Not provided'}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                                      <p>{selectedVendor.profiles?.email || 'Not available'}</p>
                                    </div>
                                  </div>
                                  <div className="mt-2">
                                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                    <p>{selectedVendor.profiles?.phone || 'Not provided'}</p>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                  {selectedVendor.verification_status === 'pending' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setRejectionReason("");
                                          // Show rejection reason dialog
                                        }}
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                      <Button
                                        onClick={() => updateVerificationStatus(selectedVendor.id, 'verified')}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Verify
                                      </Button>
                                    </>
                                  )}
                                  
                                  {selectedVendor.verification_status === 'rejected' && (
                                    <Button
                                      onClick={() => updateVerificationStatus(selectedVendor.id, 'verified')}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Verify Now
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {vendor.verification_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateVerificationStatus(vendor.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateVerificationStatus(vendor.id, 'verified')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
