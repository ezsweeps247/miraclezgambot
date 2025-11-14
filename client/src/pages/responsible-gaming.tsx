import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Clock, Users, AlertCircle, Lock, FileText } from 'lucide-react';
import { Link } from 'wouter';

export default function ResponsibleGaming() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[10px] font-bold mb-4">Responsible Gaming Policy</h1>
          <p className="text-muted-foreground text-[10px]">
            Version 1.8 | Last Updated: March 14, 2025
          </p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <Shield className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                Our Commitment to Responsible Social Gameplay
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                At Miraclez Gaming (hereinafter, "we," "us," or "our"), we aim to ensure that every participant 
                (hereinafter, "you," or "your") has a safe, positive, and enjoyable experience on our social casino 
                platform (the "Platform"). Although most users play purely for fun, a limited subset may encounter 
                complications with excessive gameplay or underage participation.
              </p>
              <p>
                This Responsible Social Gameplay Policy (hereinafter, the "Policy") details our practices, your 
                responsibilities, and the tools available to maintain a healthy gaming environment. We also offer 
                self-exclusion, cooling-off options, and spending controls to support those who wish to manage 
                their gameplay more proactively.
              </p>
              <p className="text-[8px] text-muted-foreground mt-4">
                This Policy should be read in tandem with our Terms & Conditions, Official Social Sweepstakes 
                Casino Rules, Privacy Policy, KYC Policy, AML/BSA Policy, Source of Funds Policy, and any 
                additional guidelines we publish. In the event of a conflict, the Terms shall govern.
              </p>
            </CardContent>
          </Card>

          {/* Age Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <Users className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                1. Age Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-[10px] font-semibold mb-2">1.1. Minimum Age Requirement</h3>
                <p className="text-muted-foreground">
                  <strong>18+ or Legal Age:</strong> You must be at least 18 years old, or of higher legal age 
                  in your jurisdiction, to access the Platform and partake in any games or sweepstakes ("Games"). 
                  By participating, you represent that you meet this threshold.
                </p>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">1.2. Our Age Verification Process</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Account Registration:</strong> New users must confirm they are at least 18.</li>
                  <li><strong>Information Collection:</strong> We collect details such as your name, address, and date of birth during sign-up to verify age requirements.</li>
                  <li><strong>Additional Checks:</strong> We may conduct further verifications through third-party solutions when necessary, ensuring compliance with pertinent laws.</li>
                  <li><strong>Advertising Practices:</strong> We do not target minors in our marketing campaigns, emphasizing our commitment to responsible gameplay.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">1.3. Consequences of Underage Play</h3>
                <p className="text-muted-foreground">
                  <strong>Breach of Terms:</strong> Any individual found below the required age who provided false 
                  or misleading information violates our Terms. Violations can result in Account Closure, Prize 
                  Forfeiture, or even legal measures (including fraud allegations).
                </p>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">1.4. Player Responsibilities</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Device Security:</strong> Protect devices with passcodes or PINs to prevent minors from unauthorized use.</li>
                  <li><strong>Account Login Confidentiality:</strong> Do not share Customer Account details if minors can access your devices.</li>
                  <li><strong>Reporting:</strong> If you suspect a minor is playing on the Platform, please contact us promptly via our support channels.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Promoting Responsible Gaming */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <AlertCircle className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                2. Promoting Responsible Social Gameplay
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-[10px] font-semibold mb-2">2.1. Objectives</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Entertainment Focus:</strong> Keep gameplay leisurely and fun.</li>
                  <li><strong>Minimize Harm:</strong> Prevent undue social, emotional, or financial difficulties.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">2.2. Tips for Players</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Play for Fun:</strong> Engage primarily for amusement; the Games are not designed to generate income.</li>
                  <li><strong>Budget Wisely:</strong> Utilize only Gold Coins or Social Coins you can afford to lose. Avoid using critical living expenses.</li>
                  <li><strong>Avoid Chasing Losses:</strong> Doubling down to recoup losses may intensify problems.</li>
                  <li><strong>Be Mindful:</strong> Refrain from playing when you're upset, exhausted, or under any impairment.</li>
                  <li><strong>Balance:</strong> Maintain a well-rounded lifestyle—moderate your gameplay time to preserve that balance.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Responsible Gaming Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <Clock className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                3. Responsible Social Gameplay Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                We provide a variety of features to assist in regulating your gameplay:
              </p>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">3.1. Self-Exclusion & Account Closure</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Temporary Self-Exclusion:</strong> Pause your Customer Account for a set duration (1–365 days).</li>
                  <li><strong>Permanent Closure:</strong> Request permanent closure at any time. Be advised, this forfeits all Gold Coins, Social Coins, and unexchanged Prizes associated with your account.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">3.2. Limit Setting</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Purchase Limits:</strong> Impose a maximum you can spend on Gold Coin packages.</li>
                  <li><strong>Time Alerts:</strong> Receive reminders after extended play sessions.</li>
                  <li><strong>Loss Limits:</strong> Set boundaries on potential losses for each session, enhancing self-control.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">3.3. Accessing These Options</h3>
                <p className="text-muted-foreground">
                  <strong>Via Account:</strong> Log in → Navigate to "Responsible Social Gameplay Options" in "My Account."<br />
                  <strong>Via Support:</strong> Alternatively, contact us for assistance through our support channels.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Eligibility & Jurisdictional Restrictions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <FileText className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                4. Eligibility & Jurisdictional Restrictions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-[10px] font-semibold mb-2">4.1. Legal Compliance</h3>
                <p className="text-muted-foreground">
                  Your participation is subject to eligibility guidelines in our Terms. You must not be located 
                  in or connect from any Excluded Territory.
                </p>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">4.2. Obligation to Obey Local Laws</h3>
                <p className="text-muted-foreground">
                  It is your responsibility to confirm that playing on our Platform is lawful in your region. 
                  Evading these constraints (e.g., via VPN, fake address) breaches our Terms and may lead to 
                  account termination.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Getting Additional Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <AlertCircle className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                5. Getting Additional Help
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-[10px] font-semibold mb-2">5.1. Professional Resources</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>
                    <strong>National Council on Problem Gambling:</strong>{' '}
                    <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">
                      www.ncpgambling.org
                    </a>
                    {' | '}1-800-522-4700
                  </li>
                  <li>
                    <strong>Responsible Gambling Council:</strong>{' '}
                    <a href="https://www.responsiblegambling.org" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">
                      www.responsiblegambling.org
                    </a>
                  </li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  If you or someone you know may be struggling with social gaming, we encourage contacting 
                  professional support organizations.
                </p>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">5.2. Self-Assessment</h3>
                <p className="text-muted-foreground">
                  Many counseling or responsible gaming sites offer self-assessment tools to evaluate personal 
                  gambling risk levels.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Data Handling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <Lock className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                6. Privacy & Data Handling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We protect your information and manage all data in accordance with our Privacy Policy. Any 
                information relevant to responsible gaming or self-exclusion is kept confidential and used 
                strictly for compliance or legitimate operational reasons.
              </p>
            </CardContent>
          </Card>

          {/* Protecting Your Account */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <Shield className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                7. Protecting Your Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-[10px] font-semibold mb-2">7.1. Account Security</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Password Integrity:</strong> Choose a strong, unique password.</li>
                  <li><strong>Two-Factor Authentication:</strong> Use it where available.</li>
                  <li><strong>Periodic Updates:</strong> Update your password regularly.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">7.2. Device Security</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Secure Devices:</strong> Keep antivirus/malware protections current.</li>
                  <li><strong>Logout After Use:</strong> Always end your session—especially on shared devices.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Source of Funds Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <FileText className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                8. Source of Funds Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Although this document centers on responsible gameplay, certain transaction patterns or purchase 
                behaviors may prompt us to request information under our Source of Funds ("SoF") policy. For 
                large-scale or suspicious transactions, we rely on SoF protocols alongside our AML/BSA and KYC 
                requirements to deter illicit financial use of the Platform. A refusal to comply with SoF requests 
                can lead to account restrictions or closure in line with our regulatory mandates.
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center pt-8 pb-4 text-[8px] text-muted-foreground">
            <p>End of Responsible Gaming Policy.</p>
            <p className="mt-2">© 2025 Miraclez Gaming. All rights reserved.</p>
          </div>
        </div>

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
    </div>
  );
}
