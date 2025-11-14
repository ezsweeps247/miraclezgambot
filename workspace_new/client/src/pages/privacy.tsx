import { ArrowLeft, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function PrivacyPage() {
  const handleDownloadPolicy = () => {
    // Create a link to download the corrected policy document (text format with all branding updated)
    const link = document.createElement('a');
    link.href = '/privacy-policy-download';
    link.download = 'Miraclez-Gaming-Privacy-Policy-v1.8.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className=" text-yellow-500"style={{width: '3px', height: '3px'}} />
        <h1 className="text-[10px] font-bold">Privacy Policy</h1>
      </div>

      {/* Privacy Policy Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className=""style={{width: '3px', height: '3px'}} />
                Miraclez Gaming Privacy Policy
              </CardTitle>
              <p className="text-[8px] text-muted-foreground">
                Version 1.8 | Last Updated: March 14, 2025
              </p>
            </div>
            <Button 
              onClick={handleDownloadPolicy}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-[10px] px-2 py-1 h-auto"
              data-testid="button-download-privacy"
            >
              <Download style={{width: '2.5px', height: '2.5px'}} className="mr-0.5" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
              <h3 className="text-[10px] font-semibold text-blue-800 dark:text-blue-200 mb-2">
                PRIVACY COMMITMENT
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                Below is the revised Privacy Policy, updated to ensure alignment with our Terms & Conditions (T&C), Version 1.8, 
                the Official Social Casino Rules, Version 1.8, and our F.A.Q. The original format and professional tone have been 
                preserved, but we have added clarifications to reflect our current policies and legal obligations. In the event of 
                any conflict, the T&C shall control.
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-[8px] mt-2">
                <strong>Download Option:</strong> The text version below contains the fully corrected Privacy Policy with all 
                "Miraclez Gaming" branding and contact information.
              </p>
            </div>

            <h2>1. INTRODUCTION</h2>
            <p>
              Welcome to Miraclez Gaming, Inc. (hereinafter referred to as "Miraclez Gaming," "Company," "we," "us," or "our"). 
              We are firmly committed to safeguarding your privacy while providing our social casino platform and sweepstakes services. 
              This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you access or use 
              our platform (including any subdomains), our mobile applications, or any related services (collectively, the "Platform").
            </p>
            <p>
              Please read this Privacy Policy carefully. By using or accessing the Platform, you acknowledge that you have read, 
              understood, and agree to be bound by its terms, as well as our Terms & Conditions (Version 1.8) and Official Social 
              Casino Rules (Version 1.8). If you do not agree, you must discontinue use of the Platform.
            </p>

            <h2>2. SCOPE</h2>
            <h3>Applicability</h3>
            <p>
              This Privacy Policy applies to all information collected by Miraclez Gaming in connection with your use of the Platform, 
              including social casino mode (using Gold Coins) and promotional sweepstakes (using Social/Sweeps Coins).
            </p>
            <h3>Third-Party Links</h3>
            <p>
              Our Platform may contain links to external sites not operated or controlled by us. We are not responsible for the 
              privacy practices of these third parties.
            </p>
            <h3>Policy Updates</h3>
            <p>
              We reserve the right to update or revise this Privacy Policy at our discretion. Any changes become effective upon posting. 
              We encourage you to review this document periodically. Continued use of the Platform after modifications are posted 
              constitutes acceptance of those changes.
            </p>

            <h2>3. INFORMATION WE COLLECT</h2>
            <p>We may collect various types of information, including but not limited to:</p>
            <h3>Personal Information</h3>
            <p>
              Such as your name, email address, mailing address, phone number, date of birth, or payment information. We collect this 
              when you register for an account, request support, or use certain Platform features, in accordance with KYC (Know Your Customer) 
              and AML/BSA (Anti-Money Laundering/Bank Secrecy Act) policies as outlined in our T&C, Section 11.
            </p>
            <h3>Non-Personal Information</h3>
            <p>
              Such as browser type, device information, referring URLs, and other technical data collected through cookies or similar technologies.
            </p>
            <h3>Usage Data</h3>
            <p>
              Information about how you interact with our Platform, including pages viewed, links clicked, and the time spent on each page.
            </p>
            <p>
              We only collect information that is necessary for the purposes outlined in this Privacy Policy or as otherwise disclosed 
              at the time of collection.
            </p>

            <h2>4. HOW WE USE YOUR INFORMATION</h2>
            <p>The ways we use your information include, but are not limited to:</p>
            <h3>Account Creation & Management</h3>
            <p>
              To set up and administer your customer account, including verification of your identity if required under our KYC or 
              AML/BSA policies, and for compliance with the Official Social Casino Rules and T&C.
            </p>
            <h3>Service Provision</h3>
            <p>
              To operate our social casino games, sweepstakes services, and fulfill promotional rewards, providing you with requested 
              features in Standard Play (Gold Coins) or Promotional Play (Social/Sweeps Coins).
            </p>
            <h3>Communication</h3>
            <p>
              To send you transactional and administrative messages such as account confirmations, notifications, updates, and security 
              alerts related to your use of the Platform.
            </p>
            <h3>Marketing & Promotions</h3>
            <p>
              To provide you with information about our products, promotions, and offers, subject to your opt-out preferences. 
              Please note, we do not sell personal information for marketing purposes in conflict with our DNSMPI 
              ("Do Not Sell My Personal Information") Policy.
            </p>
            <h3>Analytics & Improvements</h3>
            <p>
              To analyze Platform performance, usage trends, and user interactions so we can enhance user experience, improve our 
              services, and develop new features.
            </p>
            <h3>Legal & Compliance</h3>
            <p>
              To comply with applicable laws, regulations, or legal processes; to respond to law enforcement requests; and to enforce 
              our Terms & Conditions, Official Social Casino Rules, or other agreements.
            </p>

            <h2>5. NO SHARING OF MOBILE INFORMATION WITH THIRD PARTIES</h2>
            <h3>Mobile Phone Number</h3>
            <p>
              We may collect your mobile phone number for account verification, security purposes (e.g., two-factor authentication), 
              or for sending transactional communications. We do not share or sell your mobile phone number to any third parties for 
              their own marketing or any other purposes.
            </p>
            <h3>Mobile Device Data</h3>
            <p>
              If you access our Platform via a mobile device, we may collect certain device information (e.g., device model, operating 
              system, unique identifiers). We do not share this information with third parties for direct marketing or unrelated business purposes.
            </p>
            <h3>Exceptions</h3>
            <p>We will only disclose mobile-related information if it is necessary:</p>
            <ul>
              <li>to fulfill our legal obligations;</li>
              <li>to protect our rights or the rights and safety of others;</li>
              <li>for legitimate internal operations (such as debugging or troubleshooting); or</li>
              <li>if you expressly consent to such sharing.</li>
            </ul>

            <h2>6. HOW WE SHARE YOUR INFORMATION</h2>
            <p>Aside from the mobile information restrictions set forth in Section 5, we may share your personal information in the following ways:</p>
            <h3>Service Providers</h3>
            <p>
              With trusted third-party vendors who assist in providing our services (e.g., payment processors, hosting providers). 
              These service providers are contractually required to keep your data confidential and to use it only for the services requested.
            </p>
            <h3>Business Transfers</h3>
            <p>
              In connection with a merger, acquisition, reorganization, or sale of assets, provided that the receiving party agrees to 
              abide by this Privacy Policy and any applicable sections of the T&C.
            </p>
            <h3>Legal Requirements</h3>
            <p>
              If required to comply with applicable laws, regulations, legal processes, or government requests, or to enforce our T&C 
              or other agreements, or to protect the rights, property, or safety of Miraclez Gaming, our users, or others.
            </p>

            <h2>7. DATA SECURITY</h2>
            <h3>Technical Measures</h3>
            <p>
              We use industry-standard encryption (e.g., SSL/TLS) and secure servers to protect data transmissions, in line with the 
              measures discussed in our T&C, Section 16 and other relevant policies.
            </p>
            <h3>Access Controls</h3>
            <p>
              We limit access to personal information to authorized personnel who need such access to perform their job functions.
            </p>
            <h3>No Absolute Guarantee</h3>
            <p>
              While we strive to protect your personal information, no security system is 100% infallible. We cannot guarantee the 
              absolute security of your data.
            </p>

            <h2>8. COOKIES & TRACKING TECHNOLOGIES</h2>
            <p>We and our partners may use cookies, web beacons, and similar technologies to:</p>
            <ul>
              <li>Remember your preferences and personalize your experience.</li>
              <li>Understand usage patterns to improve the Platform's functionality.</li>
              <li>Measure the effectiveness of marketing campaigns.</li>
            </ul>
            <p>
              You can control or delete cookies via your browser settings, but disabling cookies may affect certain Platform features 
              (e.g., login or personalization).
            </p>

            <h2>9. YOUR CHOICES & RIGHTS</h2>
            <h3>Opt-Out of Marketing</h3>
            <p>
              You can unsubscribe from our marketing emails at any time by following the instructions provided in the messages or 
              by contacting us via the email in Section 13.
            </p>
            <h3>Account Management</h3>
            <p>
              You may review, update, or correct your account information by logging into your account or contacting us.
            </p>
            <h3>Data Access & Deletion</h3>
            <p>
              Subject to applicable laws, you may request access to or deletion of your personal information in our records. We will 
              respond in accordance with any relevant privacy statutes or regulations.
            </p>
            <h3>DNSMPI (Do Not Sell My Personal Information)</h3>
            <ul>
              <li>California residents and similarly protected consumers may opt out of personal information sales by contacting us.</li>
              <li>While our business model typically does not involve selling user data, we provide this option to comply with applicable privacy statutes.</li>
            </ul>

            <h2>10. CHILDREN'S PRIVACY</h2>
            <p>
              The Platform is not directed at individuals under 18 (or the applicable age of majority in their jurisdiction). We do not 
              knowingly collect personal information from minors. If you believe that a minor has provided us with personal information, 
              please contact us immediately so we can take appropriate actions, in line with our Official Social Casino Rules and T&C 
              regarding eligibility.
            </p>

            <h2>11. INTERNATIONAL USERS</h2>
            <p>
              Miraclez Gaming operates primarily in the United States. If you access the Platform from outside the U.S., please be aware 
              that your information may be transferred to, stored, and processed in the U.S. By using the Platform, you consent to any 
              such transfer of information outside your country.
            </p>

            <h2>12. RETENTION</h2>
            <p>
              We retain personal information for as long as needed to fulfill the purposes outlined in this Privacy Policy (e.g., compliance 
              with legal obligations, dispute resolution, and enforcement of our agreements). Retention periods vary depending on the type 
              of data and the nature of our relationship, as also noted in the T&C, Section 12.
            </p>

            <h2>13. CONTACT US</h2>
            <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out:</p>
            <p>
              <strong>Miraclez Gaming, Inc.</strong><br />
              <strong>Email:</strong> privacy@miraclez.gaming<br />
              <strong>Website:</strong> https://www.miraclez.gaming
            </p>

            <h2>14. CHANGES TO THIS PRIVACY POLICY</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes to our practices, legal requirements, or operational 
              needs. Any updated version will be posted on the Platform with a revised Date of Last Update. Continued use of the Platform 
              following any changes indicates your acceptance of such changes.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 my-6">
              <h3 className="text-[10px] font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                ACKNOWLEDGMENT
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300">
                BY CONTINUING TO USE THE PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY, 
                INCLUDING THE SECTION ON NO SHARING OF MOBILE INFORMATION WITH THIRD PARTIES AND THE DNSMPI RIGHTS, AS WELL 
                AS ALL PROVISIONS IN OUR OFFICIAL SOCIAL CASINO RULES AND THE T&C.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t">
              <p className="text-[8px] text-muted-foreground">
                © 2025 Miraclez Gaming, Inc. All rights reserved. This Privacy Policy is effective as of the date listed above 
                and supersedes all previous versions. Miraclez Gaming reserves the right to modify this policy at any time with 
                appropriate notice to users.
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
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors rounded-lg"
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