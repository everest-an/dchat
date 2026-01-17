import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Award, ExternalLink, CheckCircle2 } from 'lucide-react'
import { formatAddress, getExplorerUrl } from '../../config/web3'

/**
 * TODO: Translate '凭证卡片组件'
 */
export default function CredentialCard({ credential }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleViewEvidence = () => {
    if (credential.evidenceHash && credential.evidenceHash.startsWith('Qm')) {
      // IPFS hash
      window.open(`https://ipfs.io/ipfs/${credential.evidenceHash}`, '_blank')
    }
  }

  const handleViewIssuer = () => {
    const url = getExplorerUrl('address', credential.issuer)
    window.open(url, '_blank')
  }

  return (
    <Card className={credential.isValid ? '' : 'opacity-50'}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {credential.title}
                {credential.isValid && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </CardTitle>
              <Badge variant="outline" className="mt-1">
                {credential.credentialType}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TODO: Translate '描述' */}
        <p className="text-sm text-gray-700">{credential.description}</p>

        {/* TODO: Translate '发行者信息' */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Avatar className="w-10 h-10">
            <AvatarFallback>
              {credential.issuer.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">发行者</p>
            <p className="text-sm text-gray-500 font-mono">
              {formatAddress(credential.issuer, 6)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewIssuer}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* TODO: Translate '相关项目' */}
        {credential.relatedProjectId > 0 && (
          <div className="text-sm">
            <span className="text-gray-500">相关项目 ID: </span>
            <span className="font-medium">#{credential.relatedProjectId}</span>
          </div>
        )}

        {/* TODO: Translate '发行日期' */}
        <div className="text-sm text-gray-500">
          发行于 {formatDate(credential.issuedAt)}
        </div>

        {/* TODO: Translate '证据链接' */}
        {credential.evidenceHash && credential.evidenceHash !== '' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewEvidence}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            查看证据
          </Button>
        )}

        {/* state */}
        {!credential.isValid && (
          <div className="text-sm text-red-500 font-medium">
            此凭证已被撤销
          </div>
        )}
      </CardContent>
    </Card>
  )
}
