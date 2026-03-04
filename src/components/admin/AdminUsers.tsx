import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, MoreHorizontal, UserPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EditUserModal from "./EditUserModal";
import AddUserModal from "./AddUserModal";

interface AdminUsersProps {
  users: any[];
  onRefresh: () => void;
}

const AdminUsers = ({ users, onRefresh }: AdminUsersProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: any } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRole === "all" ||
      user.user_type === filterRole ||
      user.account_type === filterRole ||
      user.primary_user_type === filterRole;
    return matchesSearch && matchesFilter;
  });

  const getUserRoles = (user: any) => {
    const roles: string[] = [];
    if (user.user_type) roles.push(user.user_type);
    if (user.account_type) roles.push(user.account_type);
    if (user.primary_user_type && user.primary_user_type !== user.user_type) roles.push(user.primary_user_type);
    if (user.user_roles && Array.isArray(user.user_roles)) roles.push(...user.user_roles);
    return [...new Set(roles)];
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'destructive' as const;
      case 'buyer': return 'default' as const;
      case 'robot_seller': case 'spare_parts_seller': case 'seller': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: confirmAction.type, user_id: confirmAction.user.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Success", description: `User ${confirmAction.type === 'delete' ? 'deleted' : confirmAction.type === 'deactivate' ? 'deactivated' : 'activated'} successfully` });
      setConfirmAction(null);
      setTimeout(() => onRefresh(), 200);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Action failed" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage all platform users and their permissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
          <Button onClick={onRefresh} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users by name, email, or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-3 py-2 border border-input bg-background rounded-md text-sm">
              <option value="all">All Roles</option>
              <option value="buyer">Buyers</option>
              <option value="robot_seller">Robot Sellers</option>
              <option value="spare_parts_seller">Parts Sellers</option>
              <option value="service_provider">Service Providers</option>
              <option value="logistics_provider">Logistics Providers</option>
              <option value="finance_provider">Finance Providers</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="text-xs">{getInitials(user.full_name || user.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.full_name || 'Unnamed User'}</p>
                          {user.company_name && <p className="text-sm text-muted-foreground">{user.company_name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-foreground">{user.email}</p>
                        {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getUserRoles(user).map((role, index) => (
                          <Badge key={index} variant={getRoleBadgeVariant(role)} className="text-xs">{role.replace('_', ' ')}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.registration_complete ? "default" : "secondary"}>
                        {user.registration_complete ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingUser(user); setEditModalOpen(true); }}>Edit User</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setConfirmAction({ type: user.registration_complete ? 'deactivate' : 'activate', user })}>
                            {user.registration_complete ? 'Deactivate User' : 'Activate User'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ type: 'delete', user })}>
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingUser && (
        <EditUserModal user={editingUser} open={editModalOpen} onOpenChange={setEditModalOpen} onUserUpdated={onRefresh} />
      )}

      <AddUserModal open={addModalOpen} onOpenChange={setAddModalOpen} onUserCreated={onRefresh} />

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'delete' ? 'Delete User' : confirmAction?.type === 'deactivate' ? 'Deactivate User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'delete'
                ? `This will permanently delete "${confirmAction?.user?.full_name || confirmAction?.user?.email}". This action cannot be undone.`
                : confirmAction?.type === 'deactivate'
                  ? `This will deactivate "${confirmAction?.user?.full_name || confirmAction?.user?.email}". They will no longer be able to log in.`
                  : `This will reactivate "${confirmAction?.user?.full_name || confirmAction?.user?.email}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={actionLoading} className={confirmAction?.type === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
