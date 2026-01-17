import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Loader2, Users, Image as ImageIcon } from 'lucide-react'
import GroupService from '../../services/GroupService'
import { useToast } from '../../contexts/ToastContext'
import { useWeb3 } from '../../contexts/Web3Context'

const CreateGroupDialog = ({ open, onOpenChange, onGroupCreated }) => {
  const { account } = useWeb3()
  const { success, error: showError } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatar: null
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      const newGroup = await GroupService.createGroup({
        name: formData.name,
        description: formData.description,
        creator: account,
        members: [] // Initial members can be added later
      })

      success('Group Created', `Group "${newGroup.name}" created successfully`)
      onGroupCreated?.(newGroup)
      onOpenChange(false)
      
      // Reset form
      setFormData({ name: '', description: '', avatar: null })
    } catch (err) {
      console.error('Failed to create group:', err)
      showError('Error', 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="text-center text-gray-500">
                <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                <span className="text-xs">Upload Avatar</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g. Project Team"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this group about?"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.name.trim()}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateGroupDialog
