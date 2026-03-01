import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Search, Plus, Minus, RefreshCw, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface UserCredit {
  seller_id: string;
  current_balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    company_name: string | null;
    avatar_url: string | null;
    account_type: string | null;
  };
}

const AdminCredits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userCredits, setUserCredits] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCredit | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [actionType, setActionType] = useState<"add" | "deduct">("add");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAllCredits();
  }, []);

  const fetchAllCredits = async () => {
    setLoading(true);
    try {
      // Fetch all seller credits
      const { data: credits, error } = await supabase
        .from("seller_credits")
        .select("seller_id, current_balance, total_earned, total_spent, created_at")
        .order("current_balance", { ascending: false });

      if (error) throw error;

      // Fetch profiles for all sellers
      const sellerIds = (credits || []).map(c => c.seller_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, company_name, avatar_url, account_type")
        .in("user_id", sellerIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const combined: UserCredit[] = (credits || []).map(c => ({
        ...c,
        profile: profileMap.get(c.seller_id) || undefined,
      }));

      setUserCredits(combined);
    } catch (error) {
      console.error("Error fetching credits:", error);
      toast({ title: "Error loading credits data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userCredit: UserCredit, type: "add" | "deduct") => {
    setSelectedUser(userCredit);
    setActionType(type);
    setCreditAmount("");
    setReason("");
    setModalOpen(true);
  };

  const handleSubmitCredits = async () => {
    if (!selectedUser || !creditAmount || !user) return;

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Please enter a valid credit amount", variant: "destructive" });
      return;
    }

    if (actionType === "deduct" && amount > selectedUser.current_balance) {
      toast({ title: "Cannot deduct more than current balance", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const newBalance = actionType === "add"
        ? selectedUser.current_balance + amount
        : selectedUser.current_balance - amount;

      // Update seller_credits
      const { error: updateError } = await supabase
        .from("seller_credits")
        .update({
          current_balance: newBalance,
          total_earned: actionType === "add"
            ? selectedUser.total_earned + amount
            : selectedUser.total_earned,
          total_spent: actionType === "deduct"
            ? selectedUser.total_spent + amount
            : selectedUser.total_spent,
          updated_at: new Date().toISOString(),
        })
        .eq("seller_id", selectedUser.seller_id);

      if (updateError) throw updateError;

      // Log the transaction
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          seller_id: selectedUser.seller_id,
          transaction_type: actionType === "add" ? "admin_credit" : "admin_debit",
          credits_amount: actionType === "add" ? amount : -amount,
          balance_before: selectedUser.current_balance,
          balance_after: newBalance,
          description: reason || `Admin ${actionType === "add" ? "added" : "deducted"} ${amount} credits`,
          reference_type: "admin_action",
        });

      if (txError) console.error("Transaction log error:", txError);

      toast({
        title: `Credits ${actionType === "add" ? "added" : "deducted"} successfully`,
        description: `${amount} credits ${actionType === "add" ? "added to" : "deducted from"} ${selectedUser.profile?.full_name || "user"}. New balance: ${newBalance}`,
      });

      setModalOpen(false);
      fetchAllCredits();
    } catch (error: any) {
      toast({ title: "Error updating credits", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = userCredits.filter(uc => {
    const term = searchTerm.toLowerCase();
    return (
      uc.profile?.full_name?.toLowerCase().includes(term) ||
      uc.profile?.email?.toLowerCase().includes(term) ||
      uc.profile?.company_name?.toLowerCase().includes(term)
    );
  });

  const totalCreditsInSystem = userCredits.reduce((sum, uc) => sum + uc.current_balance, 0);
  const totalEarned = userCredits.reduce((sum, uc) => sum + uc.total_earned, 0);
  const totalSpent = userCredits.reduce((sum, uc) => sum + uc.total_spent, 0);

  const getInitials = (name: string | null | undefined) => {
    return name ? name.split(" ").map(n => n[0]).join("").toUpperCase() : "U";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Credit Management</h2>
          <p className="text-muted-foreground">View and manage credits for all users</p>
        </div>
        <Button onClick={fetchAllCredits} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userCredits.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active Credits</p>
                <p className="text-2xl font-bold text-primary">{totalCreditsInSystem.toLocaleString("en-IN")}</p>
              </div>
              <Coins className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-emerald-600">{totalEarned.toLocaleString("en-IN")}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-orange-600">{totalSpent.toLocaleString("en-IN")}</p>
              </div>
              <Minus className="h-8 w-8 text-orange-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Credits ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((uc) => (
                  <TableRow key={uc.seller_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={uc.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(uc.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {uc.profile?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">{uc.profile?.email}</p>
                          {uc.profile?.company_name && (
                            <p className="text-xs text-muted-foreground">{uc.profile.company_name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {uc.profile?.account_type || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {uc.current_balance.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {uc.total_earned.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {uc.total_spent.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          onClick={() => handleOpenModal(uc, "add")}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          onClick={() => handleOpenModal(uc, "deduct")}
                        >
                          <Minus className="h-3 w-3 mr-1" />
                          Deduct
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Deduct Credits Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "add" ? (
                <Plus className="h-5 w-5 text-emerald-600" />
              ) : (
                <Minus className="h-5 w-5 text-destructive" />
              )}
              {actionType === "add" ? "Add Credits" : "Deduct Credits"}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.profile?.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(selectedUser.profile?.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.profile?.full_name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.profile?.email}</p>
                  <p className="text-sm font-medium text-primary">
                    Current Balance: {selectedUser.current_balance.toLocaleString("en-IN")} credits
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Credit Amount</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter number of credits"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder={`Reason for ${actionType === "add" ? "adding" : "deducting"} credits...`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Preview */}
              {creditAmount && !isNaN(parseInt(creditAmount)) && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="text-sm text-muted-foreground">New Balance Preview:</p>
                  <p className="text-lg font-bold text-primary">
                    {(actionType === "add"
                      ? selectedUser.current_balance + parseInt(creditAmount)
                      : selectedUser.current_balance - parseInt(creditAmount)
                    ).toLocaleString("en-IN")} credits
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCredits}
              disabled={submitting || !creditAmount}
              className={actionType === "add" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              variant={actionType === "deduct" ? "destructive" : "default"}
            >
              {submitting ? "Processing..." : `${actionType === "add" ? "Add" : "Deduct"} Credits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCredits;
