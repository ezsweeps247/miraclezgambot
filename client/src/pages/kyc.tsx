import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Shield, AlertTriangle, CheckCircle, Clock, User, FolderOpen, Eye } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";

const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(2, "Nationality is required"),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State/Province is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(2, "Country is required"),
  }),
});

const documentTypes = {
  PASSPORT: "Passport",
  DRIVERS_LICENSE: "Driver's License",
  NATIONAL_ID: "National ID Card",
  PROOF_OF_ADDRESS: "Proof of Address",
  BANK_STATEMENT: "Bank Statement",
  UTILITY_BILL: "Utility Bill"
} as const;

interface KycStatus {
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_ADDITIONAL_INFO';
  verificationId?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredDocuments?: string[];
  submittedDocuments?: string[];
  reviewNotes?: string;
}

interface DocumentUpload {
  type: keyof typeof documentTypes;
  file?: File;
  url?: string;
  metadata: {
    documentNumber?: string;
    expiryDate?: string;
    issuingCountry?: string;
  };
}

export default function KycPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [currentStep, setCurrentStep] = useState<'info' | 'documents' | 'review'>('info');

  const form = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      nationality: "",
      address: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
    },
  });

  // Get KYC status
  const { data: kycStatus, isLoading: statusLoading } = useQuery<KycStatus>({
    queryKey: ["/api/kyc/status"],
    retry: false,
  });

  // Check if KYC is required
  const { data: kycRequirement } = useQuery<{
    required: boolean;
    reason?: string;
    deadline?: string;
  }>({
    queryKey: ["/api/kyc/requirement"],
    retry: false,
  });

  // Submit KYC documents
  const submitKycMutation = useMutation({
    mutationFn: async (data: {
      personalInfo: z.infer<typeof personalInfoSchema>;
      documents: Array<{
        type: string;
        imageUrl: string;
        metadata: any;
      }>;
    }) => {
      const response = await apiRequest("POST", "/api/kyc/submit", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "KYC Submitted",
        description: "Your documents have been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/status"] });
      setCurrentStep('review');
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "Failed to submit KYC documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/kyc/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleDocumentUpload = (
    docType: keyof typeof documentTypes,
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      setDocuments(prev => [
        ...prev.filter(d => d.type !== docType),
        {
          type: docType,
          url: uploadedFile.uploadURL as string,
          metadata: {}
        }
      ]);
      toast({
        title: "Document Uploaded",
        description: `${documentTypes[docType]} has been uploaded successfully.`,
      });
    }
  };

  const addDocumentMetadata = (docType: keyof typeof documentTypes, metadata: any) => {
    setDocuments(prev => prev.map(doc => 
      doc.type === docType ? { ...doc, metadata: { ...doc.metadata, ...metadata } } : doc
    ));
  };

  const onSubmitPersonalInfo = (data: z.infer<typeof personalInfoSchema>) => {
    setCurrentStep('documents');
  };

  const onSubmitKyc = () => {
    const personalInfo = form.getValues();
    const documentsToSubmit = documents.map(doc => ({
      type: doc.type,
      imageUrl: doc.url!,
      metadata: {
        ...doc.metadata,
        personalInfo
      }
    }));

    submitKycMutation.mutate({
      personalInfo,
      documents: documentsToSubmit
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500"><CheckCircle style={{width: '3px', height: '3px'}} className="mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><AlertTriangle style={{width: '3px', height: '3px'}} className="mr-1" />Rejected</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-blue-500"><Clock style={{width: '3px', height: '3px'}} className="mr-1" />Under Review</Badge>;
      case 'REQUIRES_ADDITIONAL_INFO':
        return <Badge className="bg-orange-500"><AlertTriangle style={{width: '3px', height: '3px'}} className="mr-1" />Additional Info Needed</Badge>;
      default:
        return <Badge variant="secondary"><Clock style={{width: '3px', height: '3px'}} className="mr-1" />Pending</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return <Badge className="bg-green-500">Low Risk</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500">Medium Risk</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500">High Risk</Badge>;
      case 'CRITICAL':
        return <Badge variant="destructive">Critical Risk</Badge>;
      default:
        return null;
    }
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading KYC status...</div>
      </div>
    );
  }

  // If KYC is already approved
  if (kycStatus?.status === 'APPROVED') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield style={{width: '3px', height: '3px'}} />
              KYC Verification Complete
            </CardTitle>
            <CardDescription>
              Your identity has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {getStatusBadge(kycStatus.status)}
              {kycStatus.riskLevel && getRiskBadge(kycStatus.riskLevel)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[10px] font-bold mb-2">KYC Verification</h1>
          <p className="text-muted-foreground">
            Complete your identity verification to access all features and higher limits.
          </p>
        </div>

        {kycRequirement?.required && (
          <Alert className="mb-6">
            <AlertTriangle className=""style={{width: '3px', height: '3px'}} />
            <AlertDescription>
              <strong>KYC Required:</strong> {kycRequirement.reason}
              {kycRequirement.deadline && (
                <span className="block mt-1">
                  Please complete verification by {new Date(kycRequirement.deadline).toLocaleDateString()}.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {kycStatus?.status && kycStatus.status !== 'PENDING' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                {getStatusBadge(kycStatus.status)}
                {kycStatus.riskLevel && getRiskBadge(kycStatus.riskLevel)}
              </div>
              {kycStatus.reviewNotes && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-[8px]">{kycStatus.reviewNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as any)}>
          <TabsList className="grid w-full grid-cols-3 bg-[#1a1a1a] p-2 rounded-xl border border-[#2a2a2a] mb-6">
            <TabsTrigger 
              value="info" 
              className="flex items-center gap-2 px-4 py-3 text-[8px] font-medium transition-all duration-300 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 hover:bg-[#2a2a2a] hover:text-white text-gray-400 border border-transparent data-[state=active]:border-purple-500/50"
              data-testid="tab-personal-info"
            >
              <User style={{width: '3.5px', height: '3.5px'}} className="" />
              <span className="hidden sm:inline">Personal Information</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="flex items-center gap-2 px-4 py-3 text-[8px] font-medium transition-all duration-300 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 hover:bg-[#2a2a2a] hover:text-white text-gray-400 border border-transparent data-[state=active]:border-teal-500/50"
              data-testid="tab-documents"
            >
              <FolderOpen style={{width: '3.5px', height: '3.5px'}} className="" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="review" 
              className="flex items-center gap-2 px-4 py-3 text-[8px] font-medium transition-all duration-300 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25 hover:bg-[#2a2a2a] hover:text-white text-gray-400 border border-transparent data-[state=active]:border-red-500/50"
              data-testid="tab-review-submit"
            >
              <Eye style={{width: '3.5px', height: '3.5px'}} className="" />
              <span className="hidden sm:inline">Review & Submit</span>
              <span className="sm:hidden">Review</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Please provide your personal details for verification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitPersonalInfo)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nationality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nationality</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., US, CA, GB" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-semibold">Address</h3>
                      <FormField
                        control={form.control}
                        name="address.street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="address.city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address.state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address.postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal Code</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="address.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., United States, Canada" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Continue to Documents
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>
                  Please upload the required documents for verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(documentTypes).slice(0, 2).map(([type, label]) => {
                  const hasUploaded = documents.some(d => d.type === type);
                  return (
                    <div key={type} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{label}</h3>
                          <p className="text-[8px] text-muted-foreground">
                            High quality image required
                          </p>
                        </div>
                        {hasUploaded ? (
                          <CheckCircle style={{width: '3px', height: '3px'}} className=" text-green-500" />
                        ) : (
                          <ObjectUploader
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={(result) => handleDocumentUpload(type as keyof typeof documentTypes, result)}
                            maxNumberOfFiles={1}
                            maxFileSize={10485760}
                          >
                            <Upload style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                            Upload {label}
                          </ObjectUploader>
                        )}
                      </div>
                      
                      {hasUploaded && type === 'PASSPORT' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <Input
                            placeholder="Passport Number"
                            onChange={(e) => addDocumentMetadata(type as keyof typeof documentTypes, { documentNumber: e.target.value })}
                          />
                          <Input
                            type="date"
                            placeholder="Expiry Date"
                            onChange={(e) => addDocumentMetadata(type as keyof typeof documentTypes, { expiryDate: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep('info')}>
                    Back
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep('review')}
                    disabled={documents.length === 0}
                  >
                    Review Submission
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>
                  Please review your information before submitting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Personal Information</h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p><strong>Name:</strong> {form.watch('firstName')} {form.watch('lastName')}</p>
                    <p><strong>Date of Birth:</strong> {form.watch('dateOfBirth')}</p>
                    <p><strong>Nationality:</strong> {form.watch('nationality')}</p>
                    <p><strong>Address:</strong> {form.watch('address.street')}, {form.watch('address.city')}, {form.watch('address.state')} {form.watch('address.postalCode')}, {form.watch('address.country')}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Uploaded Documents</h3>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.type} className="flex items-center gap-2 p-2 border rounded">
                        <FileText style={{width: '3.5px', height: '3.5px'}} className="" />
                        <span>{documentTypes[doc.type]}</span>
                        <CheckCircle style={{width: '3.5px', height: '3.5px'}} className="text-green-500 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>

                <Alert>
                  <Shield className=""style={{width: '3px', height: '3px'}} />
                  <AlertDescription>
                    By submitting this information, you confirm that all details are accurate and you consent to identity verification processing.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep('documents')}>
                    Back
                  </Button>
                  <Button 
                    onClick={onSubmitKyc}
                    disabled={submitKycMutation.isPending || documents.length === 0}
                  >
                    {submitKycMutation.isPending ? "Submitting..." : "Submit for Review"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}