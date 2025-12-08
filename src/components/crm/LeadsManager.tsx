import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Search, 
  Lock, 
  Unlock, 
  Phone, 
  Mail, 
  Building2,
  Calendar,
  MessageSquare,
  FileText,
  MoreHorizontal,
  Loader2,
  Plus,
  Filter,
  Eye
} from 'lucide-react';
import { useSellerCRM, type Lead } from '@/hooks/useSellerCRM';
import { format, formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface LeadsManagerProps {
  sellerId: string;
  itemType?: string;
}

const STATUS_CONFIG: Record<Lead['status'], { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  contacted: { label: 'Contacted', color: 'text-yellow-700', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  quoted: { label: 'Quoted', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  negotiating: { label: 'Negotiating', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  closed_won: { label: 'Won', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-900/30' },
  closed_lost: { label: 'Lost', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30' }
};

const PRIORITY_CONFIG: Record<Lead['priority'], { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-600' },
  medium: { label: 'Medium', color: 'text-blue-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' }
};

const LeadsManager = ({ sellerId, itemType }: LeadsManagerProps) => {
  const { 
    leads, 
    unlockBuyerInfo, 
    updateLeadStatus, 
    updateLeadNotes,
    scheduleFollowUp,
    addActivity,
    creditsBalance 
  } = useSellerCRM(itemType);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.buyer_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleUnlock = async (lead: Lead) => {
    setUnlocking(lead.id);
    await unlockBuyerInfo(lead.id, lead.item_type);
    setUnlocking(null);
  };

  const handleStatusChange = async (leadId: string, status: Lead['status']) => {
    await updateLeadStatus(leadId, status);
  };

  const handleScheduleFollowUp = async () => {
    if (!selectedLead || !followUpDate) return;
    await scheduleFollowUp(selectedLead.id, followUpDate);
    setShowFollowUpModal(false);
    setFollowUpDate('');
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    await updateLeadNotes(selectedLead.id, notes);
    setShowLeadModal(false);
  };

  const getMaskedValue = (value: string | null, isUnlocked: boolean): string => {
    if (isUnlocked && value) return value;
    return 'XXXXX';
  };

  const getCreditsNeeded = (leadItemType: string): number => {
    return leadItemType === 'robots' ? 10 : 5;
  };

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <SelectItem key={value} value={value}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground">
            Leads will appear here when users interact with your products
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const statusConfig = STATUS_CONFIG[lead.status];
            const priorityConfig = PRIORITY_CONFIG[lead.priority];
            const creditsNeeded = getCreditsNeeded(lead.item_type);
            const canUnlock = creditsBalance >= creditsNeeded;

            return (
              <div
                key={lead.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-full ${lead.is_unlocked ? 'bg-green-100' : 'bg-muted'}`}>
                        {lead.is_unlocked ? (
                          <Unlock className="w-4 h-4 text-green-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {getMaskedValue(lead.buyer_name, lead.is_unlocked)}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {getMaskedValue(lead.buyer_company, lead.is_unlocked)}
                        </p>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-3 text-sm mb-3">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {getMaskedValue(lead.buyer_phone, lead.is_unlocked)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {getMaskedValue(lead.buyer_email, lead.is_unlocked)}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{lead.item_name || 'Unknown Product'}</span>
                      <Badge variant="outline" className="text-xs capitalize">{lead.item_type}</Badge>
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                        {statusConfig.label}
                      </Badge>
                      <Badge variant="outline" className={priorityConfig.color}>
                        {priorityConfig.label}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </p>

                    <div className="flex items-center gap-2">
                      {!lead.is_unlocked && (
                        <Button
                          size="sm"
                          variant={canUnlock ? "default" : "outline"}
                          onClick={() => handleUnlock(lead)}
                          disabled={!canUnlock || unlocking === lead.id}
                          className="text-xs h-8"
                        >
                          {unlocking === lead.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Unlock className="w-3 h-3 mr-1" />
                          )}
                          Unlock ({creditsNeeded} credits)
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => {
                            setSelectedLead(lead);
                            setNotes(lead.notes || '');
                            setShowLeadModal(true);
                          }}>
                            <FileText className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedLead(lead);
                            setShowFollowUpModal(true);
                          }}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Follow-up
                          </DropdownMenuItem>
                          {lead.is_unlocked && (
                            <DropdownMenuItem>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Start Chat
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">Change Status</div>
                          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <DropdownMenuItem 
                              key={status}
                              onClick={() => handleStatusChange(lead.id, status as Lead['status'])}
                              disabled={lead.status === status}
                            >
                              <div className={`w-2 h-2 rounded-full ${config.bg} mr-2`} />
                              {config.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {lead.next_follow_up && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <Calendar className="w-3 h-3" />
                        Follow-up: {format(new Date(lead.next_follow_up), 'MMM d')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead Details Modal */}
      <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">Name</label>
                  <p className="font-medium">{getMaskedValue(selectedLead.buyer_name, selectedLead.is_unlocked)}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Company</label>
                  <p className="font-medium">{getMaskedValue(selectedLead.buyer_company, selectedLead.is_unlocked)}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Phone</label>
                  <p className="font-medium">{getMaskedValue(selectedLead.buyer_phone, selectedLead.is_unlocked)}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Email</label>
                  <p className="font-medium">{getMaskedValue(selectedLead.buyer_email, selectedLead.is_unlocked)}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Product</label>
                  <p className="font-medium">{selectedLead.item_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Status</label>
                  <Badge className={`${STATUS_CONFIG[selectedLead.status].bg} ${STATUS_CONFIG[selectedLead.status].color} border-0`}>
                    {STATUS_CONFIG[selectedLead.status].label}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadModal(false)}>Cancel</Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Follow-up Date</label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpModal(false)}>Cancel</Button>
            <Button onClick={handleScheduleFollowUp} disabled={!followUpDate}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsManager;