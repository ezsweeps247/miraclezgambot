import { ArrowLeft, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function TermsPage() {
  const handleDownloadPDF = () => {
    // Create a link to download the PDF
    const link = document.createElement('a');
    link.href = '/attached_assets/terms-and-conditions.pdf';
    link.download = 'Miraclez-Terms-and-Conditions.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className=" text-yellow-500"style={{width: '3px', height: '3px'}} />
        <h1 className="text-[10px] font-bold">Terms & Conditions</h1>
      </div>

      {/* Terms Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className=""style={{width: '3px', height: '3px'}} />
                Miraclez Gaming Terms & Conditions
              </CardTitle>
              <p className="text-[8px] text-muted-foreground">
                Version 1.9 | Last Updated: April 11, 2025 | Effective Date: March 14, 2025
              </p>
            </div>
            <Button 
              onClick={handleDownloadPDF}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-[10px] px-2 py-1 h-auto"
              data-testid="button-download-terms"
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
                IMPORTANT NOTICE
              </h3>
              <p className="text-[8px] text-yellow-700 dark:text-yellow-300">
                Please read these Terms and Conditions ("Terms") carefully before accessing or using any
                part of the Miraclez Gaming, Inc. ("Miraclez Gaming," the "Company," "we," "us," or "our") 
                website, mobile application, or related services (collectively, the "Platform"). By creating 
                an account, selecting "I Accept," or otherwise manifesting assent, you agree to be bound by 
                these Terms in their entirety.
              </p>
            </div>

            <h2>1. ACCEPTANCE AND AGREEMENT</h2>
            <h3>1.1. Binding Contract</h3>
            <p>
              By (a) clicking "I Accept" or any equivalent button, (b) registering an account, or (c) accessing
              any Game or feature on our Platform, you (the "Player" or "you") irrevocably consent to be
              legally bound by these Terms in their entirety, including all policies referenced herein.
            </p>

            <h3>1.2. Integrated Policies</h3>
            <p>The following policies are incorporated by reference and are deemed an integral part of these Terms:</p>
            <ul>
              <li>Privacy Policy</li>
              <li>Responsible Social Gameplay Policy</li>
              <li>Online Social Casino Official Rules</li>
              <li>Customer Acceptance Policy</li>
              <li>KYC Policy</li>
              <li>AML/BSA Policy</li>
            </ul>

            <h3>1.3. Affirmation of No Purchase Necessary</h3>
            <p>
              You understand and agree that no purchase is required to acquire Social Coins or Sweeps
              Coins (collectively, sweepstakes entries) or to participate in any sweepstakes promotions.
              Purchasing Gold Coins does not enhance your likelihood of winning.
            </p>

            <h2>2. IMPORTANT NOTICE</h2>
            <h3>2.1. No Real-Money Gambling</h3>
            <p>
              Miraclez Gaming provides social casino-style games and sweepstakes (collectively, the "Games").
              These do not constitute real-money gambling under state or federal laws, and you cannot
              expend or commit actual currency in contravention of any such laws.
            </p>

            <h3>2.2. No Purchase Necessary</h3>
            <p>
              Participation in sweepstakes is always free. Refer to our Official Rules for instructions on
              acquiring Social/Sweeps Coins without charge (e.g., mail-in requests, log-in bonuses).
            </p>

            <h3>2.3. Eligibility</h3>
            <p>
              Our Services are available solely to persons legally permitted within the United States
              (excluding specific states) and Canada (excluding Quebec), who are physically present therein
              and at least 18 years old or the age of majority in their jurisdiction.
            </p>

            <h3>2.4. Excluded or Restricted Territories</h3>
            <p>
              The Site's services, including all sweepstakes and contests offered through the Site, are not
              available to individuals located in any Excluded Territory. For the purposes of this Agreement, an
              "Excluded Territory" includes each of the following: the U.S. states of Connecticut, Delaware,
              Georgia, Idaho, Kentucky, Louisiana, Maryland, Michigan, Montana, Nevada, New Jersey,
              New York, North Carolina, Pennsylvania, Rhode Island, Washington, and West Virginia; as
              well as the Canadian provinces of Ontario and Quebec.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 my-4">
              <h4 className="text-[10px] font-semibold text-blue-800 dark:text-blue-200">Complete Terms Available</h4>
              <p className="text-blue-700 dark:text-blue-300 text-[8px] mt-1">
                This is a summary of key sections. For the complete Terms & Conditions document 
                including all sections covering definitions, licensing, customer accounts, games, 
                promotions, verification requirements, and more, please download the full PDF above.
              </p>
            </div>

            <h2>Contact Information</h2>
            <p>
              For questions about these Terms & Conditions, please contact us at:
              <br />
              <strong>Email:</strong> support@miraclez.gaming
              <br />
              <strong>Live Support:</strong> Available 24/7 through our platform
            </p>

            <div className="mt-8 pt-4 border-t">
              <p className="text-[8px] text-muted-foreground">
                These Terms & Conditions are effective as of the date listed above and supersede all 
                previous versions. Miraclez Gaming reserves the right to modify these terms at any time 
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