import { useState } from 'react'
import reportService from '../services/ReportService'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Flag } from 'lucide-react'

/**
 * ReportDialog — allows the user to report a message or user.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   reportedUserId: number,
 *   reportedMessageId?: number,
 *   reportedUserName?: string,
 * }} props
 */
export default function ReportDialog({
  open,
  onClose,
  reportedUserId,
  reportedMessageId,
  reportedUserName = 'this user',
}) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const reasons = reportService.getReasons()

  const handleClose = () => {
    setReason('')
    setDescription('')
    setError(null)
    setSuccess(false)
    setLoading(false)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!reason) {
      setError('Please select a reason')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await reportService.createReport({
        reported_user_id: reportedUserId,
        reported_message_id: reportedMessageId || undefined,
        reason,
        description: description.trim() || undefined,
      })

      setSuccess(true)
      setTimeout(handleClose, 2000)
    } catch (err) {
      setError(err.message || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report {reportedUserName}
          </DialogTitle>
          <DialogDescription>
            {reportedMessageId
              ? 'Report this message for violating community guidelines.'
              : 'Report this user for violating community guidelines.'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-sm text-center text-gray-600">
              Report submitted. Our team will review it shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Reason</p>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reason === r.value
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5 accent-red-500"
                    />
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-gray-500">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Additional details (optional)</p>
              <Textarea
                placeholder="Provide more context about the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={loading || !reason}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
