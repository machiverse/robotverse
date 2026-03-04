import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

const AddUserModal = ({ open, onOpenChange, onUserCreated }: AddUserModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    company_name: "",
    user_type: "buyer",
    account_type: "buyer",
    location: "",
    password: "",
    status: "active",
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      mobile_number: "",
      company_name: "",
      user_type: "buyer",
      account_type: "buyer",
      location: "",
      password: "",
      status: "active",
    });
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast({ variant: "destructive", title: "Error", description: "Email and password are required" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "create", ...formData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Success", description: "User account created successfully" });
      resetForm();
      onOpenChange(false);
      setTimeout(() => onUserCreated(), 200);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create user" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add_full_name">Full Name *</Label>
              <Input id="add_full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Enter full name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_email">Email *</Label>
              <Input id="add_email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_mobile">Mobile Number</Label>
              <Input id="add_mobile" value={formData.mobile_number} onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })} placeholder="Enter mobile number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_company">Company Name</Label>
              <Input id="add_company" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Enter company name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_location">Location</Label>
              <Input id="add_location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Enter location" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_password">Password *</Label>
              <div className="relative">
                <Input id="add_password" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_account_type">Account Type</Label>
              <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v, user_type: v === "seller" ? "robot_seller" : v })}>
                <SelectTrigger id="add_account_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="logistics">Logistics Provider</SelectItem>
                  <SelectItem value="finance">Finance Provider</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_user_type">User Type / Role</Label>
              <Select value={formData.user_type} onValueChange={(v) => setFormData({ ...formData, user_type: v })}>
                <SelectTrigger id="add_user_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="robot_seller">Robot Seller</SelectItem>
                  <SelectItem value="spare_parts_seller">Spare Parts Seller</SelectItem>
                  <SelectItem value="service_provider">Service Provider</SelectItem>
                  <SelectItem value="logistics_provider">Logistics Provider</SelectItem>
                  <SelectItem value="finance_provider">Finance Provider</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="add_status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger id="add_status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
