import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Shield, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { keccak256, encodePacked, recoverMessageAddress, type Address, type Hex } from 'viem';

export default function VerifyNFTPage() {
  const { toast } = useToast();
  const [contractAddress, setContractAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [tokenId, setTokenId] = useState('1');
  const [amount, setAmount] = useState('1');
  const [salt, setSalt] = useState('');
  const [signature, setSignature] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    recoveredSigner?: string;
    error?: string;
  } | null>(null);

  const verifySignature = async () => {
    try {
      if (!contractAddress || !toAddress || !salt || !signature) {
        setVerificationResult({
          valid: false,
          error: 'All fields are required',
        });
        return;
      }

      // Build the message hash matching the contract's verification logic:
      // keccak256(abi.encodePacked(address(this), "MINT", to, id, amount, salt))
      const messageHash = keccak256(
        encodePacked(
          ['address', 'string', 'address', 'uint256', 'uint256', 'bytes32'],
          [
            contractAddress as Address,
            'MINT',
            toAddress as Address,
            BigInt(tokenId),
            BigInt(amount),
            salt as Hex,
          ]
        )
      );

      // Recover the signer from the signature
      const recoveredSigner = await recoverMessageAddress({
        message: { raw: messageHash },
        signature: signature as Hex,
      });

      setVerificationResult({
        valid: true,
        recoveredSigner,
      });
    } catch (error: any) {
      setVerificationResult({
        valid: false,
        error: error.message || 'Failed to verify signature',
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">NFT Signature Verification</CardTitle>
                <CardDescription className="text-gray-400">
                  Verify PlayerPass1155 mintWithSig signatures off-chain
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Verification Form */}
        <Card className="bg-[#1a1a1a] border-gray-800" data-testid="card-verification-form">
          <CardHeader>
            <CardTitle className="text-white">Signature Parameters</CardTitle>
            <CardDescription className="text-gray-400 text-xs">
              Enter the signature parameters to verify the signer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contractAddress" className="text-gray-300">
                Contract Address
              </Label>
              <Input
                id="contractAddress"
                placeholder="0x..."
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
                data-testid="input-contract-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toAddress" className="text-gray-300">
                Recipient Address
              </Label>
              <Input
                id="toAddress"
                placeholder="0x..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
                data-testid="input-to-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokenId" className="text-gray-300">
                  Token ID
                </Label>
                <Input
                  id="tokenId"
                  type="number"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                  data-testid="input-token-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-300">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                  data-testid="input-amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salt" className="text-gray-300">
                Salt (32-byte hex)
              </Label>
              <Input
                id="salt"
                placeholder="0x..."
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white font-mono text-xs"
                data-testid="input-salt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature" className="text-gray-300">
                Signature
              </Label>
              <Input
                id="signature"
                placeholder="0x..."
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white font-mono text-xs"
                data-testid="input-signature"
              />
            </div>

            <Button
              onClick={verifySignature}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              data-testid="button-verify-signature"
            >
              <Shield className="w-4 h-4 mr-2" />
              Verify Signature
            </Button>
          </CardContent>
        </Card>

        {/* Verification Result */}
        {verificationResult && (
          <Card className={`border ${verificationResult.valid ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`} data-testid="card-verification-result">
            <CardHeader>
              <div className="flex items-center gap-2">
                {verificationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <CardTitle className="text-white">Signature Valid</CardTitle>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <CardTitle className="text-white">Signature Invalid</CardTitle>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationResult.valid && verificationResult.recoveredSigner ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-xs">Recovered Signer</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 rounded bg-gray-900 text-green-400 text-xs font-mono break-all" data-testid="text-recovered-signer">
                        {verificationResult.recoveredSigner}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(verificationResult.recoveredSigner!, 'Signer address')}
                        className="text-gray-400 hover:text-white"
                        data-testid="button-copy-signer"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Alert className="bg-green-900/20 border-green-700/50">
                    <AlertDescription className="text-green-300 text-xs">
                      ✓ This signature was created by the recovered signer address above.
                      <br />
                      ✓ The signature can only be used once (replay protection via salt).
                      <br />
                      ✓ Make sure the recovered signer matches the authorized signer on the contract.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert className="bg-red-900/20 border-red-700/50">
                  <AlertDescription className="text-red-300 text-xs" data-testid="text-error-message">
                    {verificationResult.error || 'Invalid signature'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Replay Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-xs mb-3">
                Each signature uses a unique salt to prevent replay attacks. Once a salt is used, it cannot be used again.
              </p>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                Salt-based nonce system
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Signature Format</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-xs mb-3">
                The signature is generated using ECDSA on the message hash: 
                <code className="block mt-2 p-2 bg-gray-900 rounded text-xs font-mono">
                  keccak256(contract, "MINT", to, id, amount, salt)
                </code>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Link */}
        <Card className="bg-gradient-to-r from-purple-900/30 to-purple-800/20 border-purple-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">Need Help?</p>
                <p className="text-purple-300 text-xs">View the PlayerPass1155 contract documentation</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-purple-500 text-purple-400 hover:bg-purple-900/30"
                onClick={() => window.open('https://sepolia.basescan.org', '_blank')}
                data-testid="button-view-docs"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Basescan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
