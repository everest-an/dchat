/**
 * BlockchainExplorer - In-app blockchain explorer for transaction and address lookup.
 * Uses ethers.js (already in project dependencies) to query chain data.
 */
import { useState } from 'react'
import { Search, ArrowUpRight, ArrowDownLeft, Copy, ExternalLink, ChevronLeft, Loader2 } from 'lucide-react'
import { ethers } from 'ethers'

const NETWORKS = [
  { key: 'mainnet', label: 'Ethereum', rpc: 'https://eth.llamarpc.com', explorer: 'https://etherscan.io' },
  { key: 'sepolia', label: 'Sepolia', rpc: 'https://rpc.sepolia.org', explorer: 'https://sepolia.etherscan.io' },
  { key: 'polygon', label: 'Polygon', rpc: 'https://polygon-rpc.com', explorer: 'https://polygonscan.com' },
  { key: 'base', label: 'Base', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org' },
]

function shortenAddr(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export default function BlockchainExplorer() {
  const [network, setNetwork] = useState(NETWORKS[0])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const search = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const provider = new ethers.JsonRpcProvider(network.rpc)

      // Detect query type
      if (/^0x[0-9a-fA-F]{64}$/.test(q)) {
        // Transaction hash
        const [tx, receipt] = await Promise.all([
          provider.getTransaction(q),
          provider.getTransactionReceipt(q),
        ])
        if (!tx) throw new Error('Transaction not found')
        setResult({
          type: 'transaction',
          data: {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: ethers.formatEther(tx.value),
            gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : '0',
            gasUsed: receipt?.gasUsed?.toString() || 'pending',
            blockNumber: tx.blockNumber || 'pending',
            status: receipt ? (receipt.status === 1 ? 'Success' : 'Failed') : 'Pending',
            nonce: tx.nonce,
          },
        })
      } else if (ethers.isAddress(q)) {
        // Address
        const [balance, code, txCount] = await Promise.all([
          provider.getBalance(q),
          provider.getCode(q),
          provider.getTransactionCount(q),
        ])
        setResult({
          type: 'address',
          data: {
            address: q,
            balance: ethers.formatEther(balance),
            isContract: code !== '0x',
            transactionCount: txCount,
          },
        })
      } else if (/^\d+$/.test(q)) {
        // Block number
        const block = await provider.getBlock(parseInt(q))
        if (!block) throw new Error('Block not found')
        setResult({
          type: 'block',
          data: {
            number: block.number,
            hash: block.hash,
            timestamp: new Date(block.timestamp * 1000).toLocaleString(),
            transactions: block.transactions.length,
            gasUsed: block.gasUsed.toString(),
            gasLimit: block.gasLimit.toString(),
            miner: block.miner,
          },
        })
      } else {
        // Try ENS
        try {
          const resolved = await provider.resolveName(q)
          if (resolved) {
            setQuery(resolved)
            const balance = await provider.getBalance(resolved)
            setResult({
              type: 'address',
              data: {
                address: resolved,
                ens: q,
                balance: ethers.formatEther(balance),
                isContract: false,
                transactionCount: await provider.getTransactionCount(resolved),
              },
            })
          } else {
            throw new Error('Not found')
          }
        } catch {
          setError('Enter a valid address, transaction hash, block number, or ENS name')
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Blockchain Explorer</h2>
      </div>

      {/* Network selector */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b">
        {NETWORKS.map(n => (
          <button
            key={n.key}
            onClick={() => { setNetwork(n); setResult(null) }}
            className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap ${
              network.key === n.key ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Address, Tx Hash, Block #, or ENS"
            className="w-full pl-9 pr-16 py-2.5 border rounded-lg text-sm"
          />
          <button
            onClick={search}
            disabled={loading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black text-white text-xs rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Search className="w-8 h-8 mb-2" />
            <p className="text-sm">Search for an address, transaction, or block</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        )}

        {result?.type === 'transaction' && (
          <TransactionView data={result.data} network={network} />
        )}
        {result?.type === 'address' && (
          <AddressView data={result.data} network={network} />
        )}
        {result?.type === 'block' && (
          <BlockView data={result.data} network={network} />
        )}
      </div>
    </div>
  )
}

function Row({ label, value, mono, copyable }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1 ml-3 text-right">
        <span className={`text-xs break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
        {copyable && (
          <button onClick={() => copyToClipboard(value)} className="p-0.5 hover:bg-gray-100 rounded">
            <Copy className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  )
}

function TransactionView({ data, network }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          data.status === 'Success' ? 'bg-green-50 text-green-600' : data.status === 'Failed' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
        }`}>
          <ArrowUpRight className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-medium">Transaction</div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            data.status === 'Success' ? 'bg-green-100 text-green-700' : data.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
          }`}>{data.status}</span>
        </div>
        <a href={`${network.explorer}/tx/${data.hash}`} target="_blank" rel="noopener noreferrer"
          className="ml-auto p-1 hover:bg-gray-100 rounded">
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </a>
      </div>
      <Row label="Hash" value={shortenAddr(data.hash)} mono copyable />
      <Row label="From" value={shortenAddr(data.from)} mono copyable />
      <Row label="To" value={data.to ? shortenAddr(data.to) : 'Contract Creation'} mono copyable />
      <Row label="Value" value={`${data.value} ETH`} />
      <Row label="Gas Price" value={`${parseFloat(data.gasPrice).toFixed(2)} Gwei`} />
      <Row label="Gas Used" value={data.gasUsed} />
      <Row label="Block" value={String(data.blockNumber)} />
      <Row label="Nonce" value={String(data.nonce)} />
    </div>
  )
}

function AddressView({ data, network }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          <ArrowDownLeft className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{data.isContract ? 'Contract' : 'Address'}</div>
          {data.ens && <span className="text-xs text-gray-500">{data.ens}</span>}
        </div>
        <a href={`${network.explorer}/address/${data.address}`} target="_blank" rel="noopener noreferrer"
          className="ml-auto p-1 hover:bg-gray-100 rounded">
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </a>
      </div>
      <Row label="Address" value={shortenAddr(data.address)} mono copyable />
      <Row label="Balance" value={`${parseFloat(data.balance).toFixed(6)} ETH`} />
      <Row label="Type" value={data.isContract ? 'Smart Contract' : 'EOA (Wallet)'} />
      <Row label="Tx Count" value={String(data.transactionCount)} />
    </div>
  )
}

function BlockView({ data, network }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold">
          #
        </div>
        <div>
          <div className="text-sm font-medium">Block #{data.number}</div>
        </div>
        <a href={`${network.explorer}/block/${data.number}`} target="_blank" rel="noopener noreferrer"
          className="ml-auto p-1 hover:bg-gray-100 rounded">
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </a>
      </div>
      <Row label="Hash" value={shortenAddr(data.hash)} mono copyable />
      <Row label="Timestamp" value={data.timestamp} />
      <Row label="Transactions" value={String(data.transactions)} />
      <Row label="Gas Used" value={data.gasUsed} />
      <Row label="Gas Limit" value={data.gasLimit} />
      <Row label="Miner" value={shortenAddr(data.miner)} mono copyable />
    </div>
  )
}
