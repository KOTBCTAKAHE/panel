import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { LoaderButton } from '@/components/ui/loader-button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useDirDetection from '@/hooks/use-dir-detection'
import useDynamicErrorHandler from '@/hooks/use-dynamic-errors'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { HardDrive, RefreshCcw, Trash2 } from 'lucide-react'
import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { UserResponse } from '@/service/api'
import { orvalFetcher } from '@/service/http'

interface HWIDManagementModalProps {
  user: UserResponse | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface HWIDInfo {
  username: string
  current_count: number
  limit: number | string
  available: number | string
  devices: string[]
}

export const HWIDManagementModal: FC<HWIDManagementModalProps> = ({ user, isOpen, onOpenChange, onSuccess }) => {
  const { t } = useTranslation()
  const dir = useDirDetection()
  const queryClient = useQueryClient()
  const { handleError } = useDynamicErrorHandler()

  const [hwidInfo, setHwidInfo] = useState<HWIDInfo | null>(null)
  const [newLimit, setNewLimit] = useState<string>('')
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const [isSettingLimit, setIsSettingLimit] = useState(false)
  const [isResettingHWIDs, setIsResettingHWIDs] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const fetchHWIDInfo = async () => {
    if (!user) return

    setIsLoadingInfo(true)
    try {
      const response = await orvalFetcher({
        url: `/api/user/${user.username}/hwid_info`,
        method: 'GET',
      })
      if (response.ok) {
        const data = await response.json()
        setHwidInfo(data)
        setNewLimit(data.limit === 'unlimited' ? '0' : String(data.limit))
      } else {
        const error = await response.json()
        toast.error(error.detail || t('errors.failedToFetch'))
      }
    } catch (error) {
      handleError(error)
    } finally {
      setIsLoadingInfo(false)
    }
  }

  const setHWIDLimit = async () => {
    if (!user) return

    const limit = parseInt(newLimit, 10)
    if (isNaN(limit) || limit < 0) {
      toast.error(t('validation.invalidValue'))
      return
    }

    setIsSettingLimit(true)
    try {
      const response = await orvalFetcher({
        url: `/api/user/${user.username}/hwid_limit?hwid_limit=${limit}`,
        method: 'PATCH',
      })

      if (response.ok) {
        toast.success(t('messages.success'))
        await fetchHWIDInfo()
        onSuccess?.()
      } else {
        const error = await response.json()
        toast.error(error.detail || t('errors.operationFailed'))
      }
    } catch (error) {
      handleError(error)
    } finally {
      setIsSettingLimit(false)
    }
  }

  const resetHWIDs = async () => {
    if (!user) return

    setIsResettingHWIDs(true)
    try {
      const response = await orvalFetcher({
        url: `/api/user/${user.username}/hwids`,
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(t('messages.success'))
        await fetchHWIDInfo()
        setShowResetConfirm(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        toast.error(error.detail || t('errors.operationFailed'))
      }
    } catch (error) {
      handleError(error)
    } finally {
      setIsResettingHWIDs(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open && user) {
      fetchHWIDInfo()
    }
    onOpenChange(open)
  }

  if (!user) return null

  const utilizationPercent = hwidInfo
    ? (hwidInfo.current_count / (typeof hwidInfo.limit === 'number' ? hwidInfo.limit : 1)) * 100
    : 0

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className={cn('max-w-md', dir === 'rtl' && 'text-right')}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {t('hwid.title') || 'HWID Management'}
            </DialogTitle>
            <DialogDescription>{t('hwid.description') || 'Manage device hardware ID limits'}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">{t('hwid.info') || 'Info'}</TabsTrigger>
              <TabsTrigger value="settings">{t('hwid.settings') || 'Settings'}</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4">
              {isLoadingInfo ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin">
                    <RefreshCcw className="h-6 w-6" />
                  </div>
                </div>
              ) : hwidInfo ? (
                <>
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3">
                      <div className="text-sm font-medium text-muted-foreground mb-1">{t('hwid.deviceCount') || 'Devices'}</div>
                      <div className="flex items-end gap-2">
                        <div className="text-2xl font-bold">{hwidInfo.current_count}</div>
                        <div className="text-sm text-muted-foreground mb-1">
                          / {typeof hwidInfo.limit === 'number' ? hwidInfo.limit : t('hwid.unlimited') || 'Unlimited'}
                        </div>
                      </div>
                      {typeof hwidInfo.limit === 'number' && (
                        <Progress value={Math.min(utilizationPercent, 100)} className="mt-2 h-1.5" />
                      )}
                    </div>

                    {typeof hwidInfo.available === 'number' && (
                      <div className="rounded-lg border p-3">
                        <div className="text-sm font-medium text-muted-foreground mb-1">{t('hwid.available') || 'Available Slots'}</div>
                        <div className="text-2xl font-bold text-green-600">{hwidInfo.available}</div>
                      </div>
                    )}

                    {hwidInfo.devices && hwidInfo.devices.length > 0 && (
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">{t('hwid.registeredDevices') || 'Registered Devices'}</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {hwidInfo.devices.map((device, idx) => (
                            <div key={idx} className="text-xs font-mono bg-muted p-1.5 rounded truncate" title={device}>
                              {device}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchHWIDInfo}
                    className="w-full"
                    disabled={isLoadingInfo}
                  >
                    <RefreshCcw className={cn('h-4 w-4 mr-2', isLoadingInfo && 'animate-spin')} />
                    {t('hwid.refresh') || 'Refresh'}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{t('errors.failedToLoad') || 'Failed to load HWID info'}</div>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('hwid.limit') || 'HWID Limit'}</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      placeholder={t('hwid.limitPlaceholder') || 'Enter limit (0 for unlimited)'}
                      className="flex-1"
                    />
                    <LoaderButton
                      onClick={setHWIDLimit}
                      loading={isSettingLimit}
                      size="sm"
                      className="w-24"
                    >
                      {t('common.set') || 'Set'}
                    </LoaderButton>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('hwid.limitHelp') || 'Enter 0 for unlimited devices'}</p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-3 text-amber-600">⚠️ {t('hwid.dangerZone') || 'Danger Zone'}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('hwid.resetDevices') || 'Reset Registered Devices'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('hwid.resetHelp') || 'This will clear all registered HWIDs and allow the user to register new devices'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('hwid.resetConfirmTitle') || 'Reset Devices?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('hwid.resetConfirmDesc') ||
                'This will clear all registered hardware IDs for this user. They will be able to register new devices immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetHWIDs}
              disabled={isResettingHWIDs}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResettingHWIDs ? t('common.processing') || 'Processing...' : t('common.confirm') || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default HWIDManagementModal
