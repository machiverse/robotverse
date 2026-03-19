import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer" },
  { value: "robot_seller", label: "Robot Seller" },
  { value: "spare_parts_seller", label: "Spare Parts Seller" },
  { value: "service_provider", label: "Service Provider" },
  { value: "logistics_provider", label: "Logistics Provider" },
  { value: "finance_provider", label: "Finance Provider" },
  { value: "admin", label: "Admin" },
];

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
    user_roles: ["buyer"] as string[],
    location: "",
    city: "",
    full_address: "",
    pincode: "",
    password: "",
    status: "active",
    seller_model_type: "subscription" as "subscription" | "commission",
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      mobile_number: "",
      company_name: "",
      user_type: "buyer",
      account_type: "buyer",
      user_roles: ["buyer"],
      location: "",
      city: "",
      full_address: "",
      pincode: "",
      password: "",
      status: "active",
      seller_model_type: "subscription",
    });
    setShowPassword(false);
  };

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const roles = prev.user_roles.includes(role)
        ? prev.user_roles.filter(r => r !== role)
        : [...prev.user_roles, role];
      const primaryRole = roles[0] || "buyer";
      return { ...prev, user_roles: roles, user_type: primaryRole };
    });
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
              <Label htmlFor="add_city">City *</Label>
              <Input id="add_city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Enter city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_full_address">Full Address</Label>
              <Input id="add_full_address" value={formData.full_address} onChange={(e) => setFormData({ ...formData, full_address: e.target.value })} placeholder="Enter full address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_pincode">Pin Code</Label>
              <Input id="add_pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="e.g. 600001" maxLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_location">Location / Region</Label>
              <Input id="add_location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="State or region (optional)" />
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
            <div className="space-y-2 col-span-2">
              <Label>User Type / Roles (select multiple)</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border border-input rounded-md bg-background">
                {ROLE_OPTIONS.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role_${role.value}`}
                      checked={formData.user_roles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <Label htmlFor={`role_${role.value}`} className="text-sm font-normal cursor-pointer">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {(formData.account_type === 'seller' || formData.user_roles.some(r => ['robot_seller', 'spare_parts_seller', 'service_provider'].includes(r))) && (
              <div className="space-y-2 col-span-2">
                <Label htmlFor="add_seller_model">Seller Business Model</Label>
                <Select value={formData.seller_model_type} onValueChange={(v: "subscription" | "commission") => setFormData({ ...formData, seller_model_type: v })}>
                  <SelectTrigger id="add_seller_model"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription + Credits</SelectItem>
                    <SelectItem value="commission">Commission-Based (5%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
