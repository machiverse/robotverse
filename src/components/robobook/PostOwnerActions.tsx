import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { canManagePost } from '@/lib/postManagement';
import { Button } from '@/components/ui/button';
import EditPostModal from '@/components/EditPostModal';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { ComponentProps } from 'react';

type ManagedPost = ComponentProps<typeof EditPostModal>['post'] & { source?: string };

export default function PostOwnerActions({ post, onUpdated, onDeleted }: { post: ManagedPost; onUpdated?: () => void; onDeleted?: (id: string) => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!canManagePost(post.author_id, user?.id, post.source)) return null;

  const remove = async () => {
    if (!user || !canManagePost(post.author_id, user.id, post.source)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('community_posts').delete().eq('id', post.id).eq('author_id', user.id).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Post could not be deleted. Please try again.');
      setDeleting(false);
      toast.success('Post deleted');
      onDeleted?.(post.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete post');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3" onClick={(event) => event.stopPropagation()}>
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit className="mr-2 h-4 w-4" />Edit Post</Button>
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(true)}><Trash2 className="mr-2 h-4 w-4" />Delete Post</Button>
      <EditPostModal post={post} open={editing} onOpenChange={setEditing} onPostUpdated={onUpdated} />
      <AlertDialog open={deleting} onOpenChange={(open) => { if (!busy) setDeleting(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete post?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}