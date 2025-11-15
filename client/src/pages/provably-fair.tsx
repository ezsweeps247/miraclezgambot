import { useEffect } from 'react';
import { Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';

export default function ProvablyFairPage() {
  useEffect(() => {
    document.title = 'Provably Fair Gaming - Miraclez Gaming';
  }, []);

  const downloadPolicy = () => {
    const content = `Provably Fair Gaming Policy - Miraclez Gaming

Version: 1.8 
Date of Last Update: March 14, 2025

1. INTRODUCTION

Miraclez Gaming (hereinafter, "we," "us," or "our"), which operates https://www.miraclezgaming.com (the "Platform"), is devoted to giving all Players (hereinafter, "you," or "your") a transparent and equitable gaming experience. This Provably Fair Gaming Policy (the "Policy") explains the techniques we apply to guarantee each game outcome can be independently verified.

Please read this Policy alongside our [Terms & Conditions] ("Terms"), [Privacy Policy], [Responsible Social Gameplay Policy], [Official Social Sweepstakes Casino Rules], [KYC Policy], [AML/BSA Policy], Source of Funds Policy, and any relevant guidelines. Where conflicts occur, the Terms have primacy.

2. HOW TO USE THE PROVABLY FAIR SYSTEM

2.1. Step 1: Request the Server Seed

Obtain the Shuffled Deck/Game Data: Prior to gameplay, you can request the Server Seed (i.e., the shuffled deck or initial game data) from our server.

Server Hash Commitment: Our server shuffles or generates the starting data, creates a hash of it, and then issues that hash to you.

Hash Commitment: This hash is our commitment to the original game state, enabling you to confirm after the fact that no tampering occurred. This aligns with fair play provisions in Section 13 of our Terms.

2.2. Step 2: Set the Client Seed

Your Contribution: You may supply a Client Seed, along with a predictable Nonce, to partially shape the ultimate game outcome.

Integrity Assurance: By combining server and client seeds, we ensure neither side can unilaterally manipulate results. This supports our stance against fraud (see Section 10 of our Terms).

2.3. Step 3: Play the Game

Seed Interaction: With both seeds in place, you proceed with gameplay.

Final Outcome: The outcome is derived from the Server Seed, Client Seed, and Nonce, delivering an unpredictable, fair result.

3. UNDERSTANDING THE "SHUFFLED" STRING

3.1. Card and Keno Games

Shuffled Deck/Numbers: For card or keno modes, we shuffle a deck (or group of numbers), hash the final arrangement, and share that hash with you (as the Server Seed).

Cut/Alteration by Client: When you apply your Client Seed (plus Nonce), you effectively perform a "cut" or change in the final order, guaranteeing it cannot be predetermined by us.

3.2. Slot Games

Random Reel Positions: We generate random numbers dictating reel stops (3–9 numbers, depending on the reel count).

Hash as Server Seed: We hash these positions, forming your Server Seed.

Client Influence: You can shift the final reel stops with your Client Seed and Nonce, further ensuring fair results.

4. VERIFYING GAME FAIRNESS

4.1. Accessing Verification Tools

Post-Game Verification: Once a round ends, navigate to LOBBY → GAMEPLAYS HISTORY → VERIFY in the Platform interface.

Displayed Data: You will see the original Server Seed (deck or slot data) plus the salt used for hashing.

4.2. Independent Verification

Hash Checking: You can use third-party utilities (e.g., a SHA-256 tool) to confirm the provided Server Seed and salt match the pre-game hash.

Caution: External sites each have their own terms (see Section 12 of our Terms). Any usage is at your own risk.

5. HOW WE USE THE CLIENT SEED TO INFLUENCE THE SERVER SEED

5.1. Slot Games

New Position = (Server Initial Position + Client Seed + Nonce) % Symbols Per Reel (SPR)

Purpose: Final reel positions rely on both your input and the server's data.

5.2. Keno Games

Cut Position X = Client Seed + Nonce

Function: This formula shifts the order of the shuffled deck (the original Server Seed), ensuring the keno draw is not manipulated by us alone.

5.3. Dice Games

New Die Value = (Original Die Value + Client Seed + Nonce) % 6

Result: The final dice outcomes incorporate your seed. We cannot unilaterally alter them.

5.4. Roulette Games

Initial Commitment: We pick a landing slot, hash it, and share that hash (the Server Seed).

Your Influence: Your Client Seed plus Nonce changes the ultimate result, preventing any server favoritism.

5.5. Scratch Games

Caveat: Scratch games remain fair but do not currently have the same provably fair verification structure outlined here.

5.6. Card Games (Including Video Poker)

Cut Position X = Client Seed + Nonce

Card Dealing: This formula modifies the final deck order, ensuring a truly fair distribution.

6. COMPLIANCE AND INTEGRITY

We maintain game integrity consistent with Sections 10 (Fraudulent Conduct) and 13 (Disruptions/Changes) of our Terms. Additionally, we adhere to pertinent laws and meet [AML/BSA], [KYC], and Source of Funds requirements. Any manipulations or barred conduct can result in account suspension or closure as per Section 20 of our Terms.

7. LIMITATIONS AND DISCLAIMER

While we provide a provably fair methodology, we cannot guarantee accuracy or reliability of third-party verification tools. Utilizing outside websites is your choice, governed by their own conditions (see Section 12 of our Terms).

8. CONTACT US

For questions, clarifications, or to learn more about verifying provably fair gameplay, you may reach us at:

Email: support@miraclezgaming.com

End of Provably Fair Gameplay.

(© 2025 Miraclez Gaming. All rights reserved.)`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'miraclez-provably-fair-policy.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-3xl font-bold text-white mb-4">
            Provably Fair Gaming Policy
          </h1>
          <p className="text-gray-400 text-sm">
            Transparent and verifiable gaming at Miraclez Gaming
          </p>
          <Button 
            onClick={downloadPolicy}
            className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-sm"
            data-testid="button-download-policy"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        {/* Content */}
        <Card className="bg-[#1a1a1a] border-gray-800 text-white">
          <CardContent className="p-8">
            <div className="space-y-8 text-gray-300">
              
              {/* Version Info */}
              <div className="text-center text-xs text-gray-400">
                <p><strong>Version:</strong> 1.8</p>
                <p><strong>Date of Last Update:</strong> March 14, 2025</p>
              </div>

              {/* Section 1 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4" data-testid="text-section-introduction">1. INTRODUCTION</h2>
                <p className="mb-4 text-sm">
                  Miraclez Gaming (hereinafter, "we," "us," or "our"), which operates https://www.miraclezgaming.com (the "Platform"), is devoted to giving all Players (hereinafter, "you," or "your") a transparent and equitable gaming experience. This Provably Fair Gaming Policy (the "Policy") explains the techniques we apply to guarantee each game outcome can be independently verified.
                </p>
                <p className="text-sm">
                  Please read this Policy alongside our [Terms & Conditions] ("Terms"), [Privacy Policy], [Responsible Social Gameplay Policy], [Official Social Sweepstakes Casino Rules], [KYC Policy], [AML/BSA Policy], Source of Funds Policy, and any relevant guidelines. Where conflicts occur, the Terms have primacy.
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4" data-testid="text-section-how-to-use">2. HOW TO USE THE PROVABLY FAIR SYSTEM</h2>
                
                <h3 className="text-lg font-semibold text-white mb-3">2.1. Step 1: Request the Server Seed</h3>
                <p className="mb-2 text-sm"><strong>Obtain the Shuffled Deck/Game Data:</strong> Prior to gameplay, you can request the Server Seed (i.e., the shuffled deck or initial game data) from our server.</p>
                <p className="mb-2 text-sm"><strong>Server Hash Commitment:</strong> Our server shuffles or generates the starting data, creates a hash of it, and then issues that hash to you.</p>
                <p className="mb-4 text-sm"><strong>Hash Commitment:</strong> This hash is our commitment to the original game state, enabling you to confirm after the fact that no tampering occurred. This aligns with fair play provisions in Section 13 of our Terms.</p>

                <h3 className="text-lg font-semibold text-white mb-3">2.2. Step 2: Set the Client Seed</h3>
                <p className="mb-2 text-sm"><strong>Your Contribution:</strong> You may supply a Client Seed, along with a predictable Nonce, to partially shape the ultimate game outcome.</p>
                <p className="mb-4 text-sm"><strong>Integrity Assurance:</strong> By combining server and client seeds, we ensure neither side can unilaterally manipulate results. This supports our stance against fraud (see Section 10 of our Terms).</p>

                <h3 className="text-lg font-semibold text-white mb-3">2.3. Step 3: Play the Game</h3>
                <p className="mb-2 text-sm"><strong>Seed Interaction:</strong> With both seeds in place, you proceed with gameplay.</p>
                <p className="text-sm"><strong>Final Outcome:</strong> The outcome is derived from the Server Seed, Client Seed, and Nonce, delivering an unpredictable, fair result.</p>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4" data-testid="text-section-shuffled-string">3. UNDERSTANDING THE "SHUFFLED" STRING</h2>
                
                <h3 className="text-lg font-semibold text-white mb-3">3.1. Card and Keno Games</h3>
                <p className="mb-2 text-sm"><strong>Shuffled Deck/Numbers:</strong> For card or keno modes, we shuffle a deck (or group of numbers), hash the final arrangement, and share that hash with you (as the Server Seed).</p>
                <p className="mb-4 text-sm"><strong>Cut/Alteration by Client:</strong> When you apply your Client Seed (plus Nonce), you effectively perform a "cut" or change in the final order, guaranteeing it cannot be predetermined by us.</p>

                <h3 className="text-lg font-semibold text-white mb-3">3.2. Slot Games</h3>
                <p className="mb-2 text-sm"><strong>Random Reel Positions:</strong> We generate random numbers dictating reel stops (3–9 numbers, depending on the reel count).</p>
                <p className="mb-2 text-sm"><strong>Hash as Server Seed:</strong> We hash these positions, forming your Server Seed.</p>
                <p className="text-sm"><strong>Client Influence:</strong> You can shift the final reel stops with your Client Seed and Nonce, further ensuring fair results.</p>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4" data-testid="text-section-verification">4. VERIFYING GAME FAIRNESS</h2>
                
                <h3 className="text-lg font-semibold text-white mb-3">4.1. Accessing Verification Tools</h3>
                <p className="mb-2 text-sm"><strong>Post-Game Verification:</strong> Once a round ends, navigate to <code className="bg-gray-800 px-2 py-1 rounded text-purple-400 text-sm">LOBBY → GAMEPLAYS HISTORY → VERIFY</code> in the Platform interface.</p>
                <p className="mb-4 text-sm"><strong>Displayed Data:</strong> You will see the original Server Seed (deck or slot data) plus the salt used for hashing.</p>

                <h3 className="text-lg font-semibold text-white mb-3">4.2. Independent Verification</h3>
                <p className="mb-2 text-sm"><strong>Hash Checking:</strong> You can use third-party utilities (e.g., a SHA-256 tool) to confirm the provided Server Seed and salt match the pre-game hash.</p>
                <p className="text-sm"><strong>Caution:</strong> External sites each have their own terms (see Section 12 of our Terms). Any usage is at your own risk.</p>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4" data-testid="text-section-client-seed">5. HOW WE USE THE CLIENT SEED TO INFLUENCE THE SERVER SEED</h2>
                
                <h3 className="text-lg font-semibold text-white mb-3">5.1. Slot Games</h3>
                <div className="bg-gray-800 p-4 rounded-lg mb-2">
                  <code className="text-purple-400 text-sm">New Position = (Server Initial Position + Client Seed + Nonce) % Symbols Per Reel (SPR)</code>
                </div>
                <p className="mb-4 text-sm"><strong>Purpose:</strong> Final reel positions rely on both your input and the server's data.</p>

                <h3 className="text-lg font-semibold text-white mb-3">5.2. Keno Games</h3>
                <div className="bg-gray-800 p-4 rounded-lg mb-2">
                  <code className="text-purple-400 text-sm">Cut Position X = Client Seed + Nonce</code>
                </div>
                <p className="mb-4 text-sm"><strong>Function:</strong> This formula shifts the order of the shuffled deck (the original Server Seed), ensuring the keno draw is not manipulated by us alone.</p>

                <h3 className="text-lg font-semibold text-white mb-3">5.3. Dice Games</h3>
                <div className="bg-gray-800 p-4 rounded-lg mb-2">
                  <code className="text-purple-400 text-sm">New Die Value = (Original Die Value + Client Seed + Nonce) % 6</code>
                </div>
                <p className="mb-4 text-sm"><strong>Result:</strong> The final dice outcomes incorporate your seed. We cannot unilaterally alter them.</p>

                <h3 className="text-lg font-semibold text-white mb-3">5.4. Roulette Games</h3>
                <p className="mb-2 text-sm"><strong>Initial Commitment:</strong> We pick a landing slot, hash it, and share that hash (the Server Seed).</p>
                <p className="mb-4 text-sm"><strong>Your Influence:</strong> Your Client Seed plus Nonce changes the ultimate result, preventing any server favoritism.</p>

                <h3 className="text-lg font-semibold text-white mb-3">5.5. Scratch Games</h3>
                <p className="mb-4 text-sm"><strong>Caveat:</strong> Scratch games remain fair but do not currently have the same provably fair verification structure outlined here.</p>

                <h3 className="text-lg font-semibold text-white mb-3">5.6. Card Games (Including Video Poker)</h3>
                <div className="bg-gray-800 p-4 rounded-lg mb-2">
                  <code className="text-purple-400 text-sm">Cut Position X = Client Seed + Nonce</code>
                </div>
                <p className="text-sm"><strong>Card Dealing:</strong> This formula modifies the final deck order, ensuring a truly fair distribution.</p>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4" data-testid="text-section-compliance">6. COMPLIANCE AND INTEGRITY</h2>
                <p className="text-sm">
                  We maintain game integrity consistent with Sections 10 (Fraudulent Conduct) and 13 (Disruptions/Changes) of our Terms. Additionally, we adhere to pertinent laws and meet [AML/BSA], [KYC], and Source of Funds requirements. Any manipulations or barred conduct can result in account suspension or closure as per Section 20 of our Terms.
                </p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4" data-testid="text-section-limitations">7. LIMITATIONS AND DISCLAIMER</h2>
                <p className="text-sm">
                  While we provide a provably fair methodology, we cannot guarantee accuracy or reliability of third-party verification tools. Utilizing outside websites is your choice, governed by their own conditions (see Section 12 of our Terms).
                </p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4" data-testid="text-section-contact">8. CONTACT US</h2>
                <p className="mb-4 text-sm">
                  For questions, clarifications, or to learn more about verifying provably fair gameplay, you may reach us at:
                </p>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm">Email: <a href="mailto:support@miraclezgaming.com" className="text-purple-400 hover:text-purple-300">support@miraclezgaming.com</a></p>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center pt-8 border-t border-gray-700">
                <p className="text-xs text-gray-500">
                  End of Provably Fair Gameplay.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  (© 2025 Miraclez Gaming. All rights reserved.)
                </p>
              </div>

            </div>
          </CardContent>
        </Card>
        
        {/* Back to Home Button */}
        <div className="flex justify-center py-6">
          <Link href="/">
            <Button 
              variant="outline" 
              size="sm"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors text-sm" 
              data-testid="button-back-home-bottom"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}