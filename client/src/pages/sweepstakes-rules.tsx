import { ArrowLeft, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function SweepstakesRulesPage() {
  const handleDownloadPDF = () => {
    // Create a link to download the PDF
    const link = document.createElement('a');
    link.href = '/sweepstakes-rules-pdf';
    link.download = 'Miraclez-Social-Casino-Official-Rules.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className=" text-yellow-500"style={{width: '3px', height: '3px'}} />
        <h1 className="text-[10px] font-bold">Sweepstakes Rules</h1>
      </div>

      {/* Rules Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className=""style={{width: '3px', height: '3px'}} />
                Miraclez Gaming Social Casino Official Rules
              </CardTitle>
              <p className="text-[8px] text-muted-foreground">
                Version 1.8 | Last Updated: March 14, 2025 | Effective Date: March 14, 2025
              </p>
            </div>
            <Button 
              onClick={handleDownloadPDF}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-[10px] px-2 py-1 h-auto"
              data-testid="button-download-rules"
            >
              <Download style={{width: '2.5px', height: '2.5px'}} className="mr-0.5" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6">
              <h3 className="text-[10px] font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                IMPORTANT NOTE
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300">
                These Official Social Casino Rules (hereinafter, the "Rules") govern the standard-play ("Social
                Casino Mode") activities on the Miraclez Gaming, Inc. ("Miraclez Gaming," "we," "us," or "our")
                entertainment platform (the "Platform"). By participating in any social casino or standard-play
                games (collectively, "Social Games"), you expressly confirm that you have read, understood,
                and agreed to be bound by these Rules in their entirety, as well as by our most current Terms &
                Conditions (hereinafter, the "T&C").
              </p>
            </div>

            <h2>TABLE OF CONTENTS</h2>
            <ol>
              <li>INTRODUCTION</li>
              <li>DEFINITIONS</li>
              <li>ELIGIBILITY & ACCESS</li>
              <li>NATURE OF SOCIAL CASINO MODE</li>
              <li>PURCHASING GOLD COINS</li>
              <li>GAMEPLAY & PLATFORM RULES</li>
              <li>RESPONSIBLE SOCIAL GAMEPLAY</li>
              <li>LIMITATION OF LIABILITY & DISPUTES</li>
              <li>MISCELLANEOUS PROVISIONS</li>
              <li>ACKNOWLEDGMENT</li>
            </ol>

            <h2>1. INTRODUCTION</h2>
            <h3>1.1. Purpose of These Rules</h3>
            <p>
              These Rules govern the Standard Play functionality (often referred to as "Social Casino Mode"
              or "Social Games") on the Platform. In Standard Play, you use Gold Coins—a purely
              entertainment-focused virtual currency—without any real-money prizes. For rules regarding
              sweepstakes-based Promotional Play, where Social/Sweeps Coins can be redeemed for
              real-world prizes, please consult the Promotional Play or Official Sweepstakes Rules as
              referenced in our T&C.
            </p>

            <h3>1.2. Relationship to the T&C</h3>
            <p>
              These Rules supplement and form an integral part of the overarching T&C. In the event of any
              conflict between these Rules and the T&C, the T&C shall control. By engaging in Social Games,
              you confirm you have read, understood, and consented to both these Rules and the T&C.
            </p>

            <h3>1.3. Key Points</h3>
            <ul>
              <li><strong>No Real-World Prizes:</strong> Social Games do not award monetary or otherwise redeemable prizes.</li>
              <li><strong>No Purchase Necessary:</strong> This principle primarily applies to sweepstakes (Promotional Play). You remain free—but not obligated—to purchase Gold Coins for additional in-game entertainment in Social Casino Mode.</li>
              <li><strong>Responsible Gameplay:</strong> You agree to play responsibly and in accordance with these Rules, our Responsible Social Gameplay Policy, and all relevant sections of the T&C.</li>
            </ul>

            <h2>2. DEFINITIONS</h2>
            <p>Unless otherwise indicated in these Rules, all capitalized terms carry the same meanings assigned to them in the T&C. By way of clarification:</p>
            <ul>
              <li><strong>"Gold Coins":</strong> A non-redeemable, non-monetary virtual currency used exclusively for Social Games (Standard Play).</li>
              <li><strong>"Social Coins" or "Sweeps Coins":</strong> Sweepstakes entries used in Promotional Play, which may be redeemable for real-world prizes if won or otherwise awarded in accordance with the T&C.</li>
              <li><strong>"Platform":</strong> The Miraclez Gaming website, mobile applications, and any subdomains through which our Games or services are offered.</li>
              <li><strong>"Player," "you," or "your":</strong> Any individual who registers or otherwise participates in our Games.</li>
            </ul>

            <h2>3. ELIGIBILITY & ACCESS</h2>
            <h3>3.1. Age Requirement</h3>
            <p>
              To participate in Social Games, you must be at least 18 years old or the legal age of majority in
              your jurisdiction (whichever is higher). Individuals not meeting this criterion are strictly prohibited
              from creating an account or using any Social Casino features.
            </p>

            <h3>3.2. Territorial Restrictions</h3>
            <p>
              Use or access from any Excluded Territory (as defined in the T&C) is disallowed. Any attempt
              to bypass these territorial restrictions (e.g., via VPN or proxy services) constitutes a breach of
              these Rules and may result in immediate account suspension or termination.
            </p>

            <h2>4. NATURE OF SOCIAL CASINO MODE</h2>
            <h3>4.1. Gold Coins</h3>
            <ul>
              <li><strong>Virtual Currency Only:</strong> Gold Coins have no monetary value and cannot be redeemed for real money, merchandise, or any other tangible goods.</li>
              <li><strong>Initial & Promotional Allocations:</strong> Upon registration, you may receive complimentary Gold Coins. Additionally, we may periodically offer promotional or bonus Gold Coins (e.g., daily check-in, special events).</li>
              <li><strong>No Impact on Sweepstakes:</strong> Purchasing Gold Coins does not confer any advantage in Promotional Play (sweepstakes) and does not alter the odds of winning any real-world prize.</li>
            </ul>

            <h3>4.2. No Real-Money Gambling</h3>
            <p>
              Social Casino Mode is for entertainment purposes only. No actual cash winnings or monetary
              payouts exist in Standard Play. You acknowledge that any Gold Coins used or lost within Social
              Games yield no real-money claims.
            </p>

            <h2>5. PURCHASING GOLD COINS</h2>
            <h3>5.1. Voluntary Purchases</h3>
            <p>
              Purchasing additional Gold Coins is entirely optional. As stated in our T&C, you do not need to
              buy anything to enjoy the Platform or its promotional sweepstakes. No purchase is ever
              necessary to acquire or use the separate Social/Sweeps Coins for Promotional Play.
            </p>

            <h3>5.2. Payment Medium</h3>
            <p>
              In conformity with the T&C, any payment method you use (credit card, e-wallet, bank account,
              etc.) must be legally and beneficially owned by you. Miraclez Gaming may request proof of
              ownership or verification documents at its discretion (see T&C Section 11 regarding KYC and SOF).
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 my-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">Complete Rules Available</h4>
              <p className="text-blue-700 dark:text-blue-300 text-[8px] mt-1">
                This page contains key sections of our Social Casino Official Rules. For the complete document 
                including all sections covering payment policies, gameplay rules, responsible gaming, 
                liability limitations, and more, please download the full PDF above.
              </p>
            </div>

            <h2>Contact Information</h2>
            <p>
              For questions about these Social Casino Rules, please contact us at:
              <br />
              <strong>Email:</strong> support@miraclez.gaming
            </p>

            <div className="mt-8 pt-4 border-t">
              <p className="text-[8px] text-muted-foreground">
                These Social Casino Official Rules are effective as of the date listed above and supersede all 
                previous versions. Miraclez Gaming reserves the right to modify these rules at any time 
                with appropriate notice to users.
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
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            data-testid="button-back-home-bottom"
          >
            <ArrowLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}