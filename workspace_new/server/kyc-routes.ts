import { Router } from "express";
import { ObjectStorageService } from "./objectStorage";
import { kycService } from "./kyc/verification-service";
import { authenticateJWT, type AuthenticatedRequest } from "./auth";

const router = Router();
const objectStorageService = new ObjectStorageService();

// Get KYC status for current user
router.get("/status", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const status = await kycService.getKycStatus(userId);
    res.json(status);
  } catch (error) {
    console.error("Error getting KYC status:", error);
    res.status(500).json({ error: "Failed to get KYC status" });
  }
});

// Check if KYC is required for current user
router.get("/requirement", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const requirement = await kycService.checkKycRequirement(userId);
    res.json(requirement);
  } catch (error) {
    console.error("Error checking KYC requirement:", error);
    res.status(500).json({ error: "Failed to check KYC requirement" });
  }
});

// Submit KYC documents
router.post("/submit", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { personalInfo, documents } = req.body;

    if (!personalInfo || !documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: "Invalid submission data" });
    }

    const result = await kycService.submitKycDocuments(userId, documents);
    res.json(result);
  } catch (error) {
    console.error("Error submitting KYC:", error);
    res.status(500).json({ error: "Failed to submit KYC documents" });
  }
});

// Get upload URL for documents
router.post("/upload", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  } catch (error) {
    console.error("Error getting upload URL:", error);
    res.status(500).json({ error: "Failed to get upload URL" });
  }
});

// Serve KYC documents (protected)
router.get("/documents/:objectPath(*)", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const objectPath = `/objects/${req.params.objectPath}`;

    // Get the object file
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    
    // Check if user owns this document
    const verification = await kycService.getKycStatus(userId);
    if (!verification.verificationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Download the document
    await objectStorageService.downloadObject(objectFile, res);
  } catch (error) {
    console.error("Error serving KYC document:", error);
    res.status(500).json({ error: "Failed to serve document" });
  }
});

export { router as kycRoutes };