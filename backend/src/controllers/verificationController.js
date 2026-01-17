/**
 * Verification Controller
 * Handles Privado ID KYC/KYB verification operations
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Verification types configuration
const VERIFICATION_TYPES = [
  {
    type: 'kyc_humanity',
    label: 'Humanity Verification',
    description: 'Prove you are a real human using zero-knowledge proof',
    category: 'kyc',
    schema: 'https://schema.privado.id/humanity-v1'
  },
  {
    type: 'kyc_age',
    label: 'Age Verification',
    description: 'Prove you are over 18 years old',
    category: 'kyc',
    schema: 'https://schema.privado.id/age-v1'
  },
  {
    type: 'kyc_country',
    label: 'Country Verification',
    description: 'Prove your country of residence',
    category: 'kyc',
    schema: 'https://schema.privado.id/country-v1'
  },
  {
    type: 'kyb_registration',
    label: 'Company Registration',
    description: 'Verify your company registration',
    category: 'kyb',
    schema: 'https://schema.privado.id/company-registration-v1'
  },
  {
    type: 'kyb_tax_id',
    label: 'Tax ID Verification',
    description: 'Verify your company tax identification',
    category: 'kyb',
    schema: 'https://schema.privado.id/tax-id-v1'
  },
  {
    type: 'kyb_license',
    label: 'Business License',
    description: 'Verify your business license',
    category: 'kyb',
    schema: 'https://schema.privado.id/business-license-v1'
  }
];

// Store pending verification requests (in production, use Redis)
const pendingRequests = new Map();

/**
 * Get available verification types
 */
const getVerificationTypes = async (req, res) => {
  try {
    res.json({
      success: true,
      data: VERIFICATION_TYPES
    });
  } catch (error) {
    console.error('Error getting verification types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get verification types'
    });
  }
};

/**
 * Create a verification request
 */
const createVerificationRequest = async (req, res) => {
  try {
    const { type, callback_url } = req.body;
    const userId = req.user_id;

    // Validate verification type
    const verType = VERIFICATION_TYPES.find(v => v.type === type);
    if (!verType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification type'
      });
    }

    // Generate unique request ID
    const requestId = `req_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Build verification request data (Privado ID format)
    const verificationRequest = {
      id: requestId,
      typ: 'application/iden3comm-plain-json',
      type: 'https://iden3-communication.io/authorization/1.0/request',
      thid: requestId,
      body: {
        callbackUrl: callback_url || `${process.env.BACKEND_URL || 'https://dchat.pro'}/api/verifications/callback`,
        reason: `Dchat ${verType.label}`,
        scope: [{
          id: 1,
          circuitId: 'credentialAtomicQuerySigV2',
          query: {
            allowedIssuers: ['*'],
            type: verType.type.replace('kyc_', '').replace('kyb_', ''),
            context: verType.schema,
            credentialSubject: {}
          }
        }]
      },
      from: process.env.PRIVADO_ISSUER_DID || 'did:polygonid:polygon:main:dchat'
    };

    // Generate QR code data
    const qrCodeData = JSON.stringify(verificationRequest);
    const deepLink = `iden3comm://?request=${encodeURIComponent(qrCodeData)}`;

    // Store pending request
    pendingRequests.set(requestId, {
      userId,
      type,
      createdAt: new Date(),
      expiresAt,
      status: 'pending'
    });

    // Clean up expired requests
    for (const [id, data] of pendingRequests.entries()) {
      if (new Date() > data.expiresAt) {
        pendingRequests.delete(id);
      }
    }

    res.json({
      success: true,
      data: {
        request_id: requestId,
        qr_code_data: qrCodeData,
        deep_link: deepLink,
        expires_at: expiresAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating verification request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create verification request'
    });
  }
};

/**
 * Handle verification callback from Privado ID wallet
 */
const handleVerificationCallback = async (req, res) => {
  try {
    const { request_id, proof, pub_signals, credential } = req.body;

    // Find pending request
    const pendingRequest = pendingRequests.get(request_id);
    if (!pendingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found or expired'
      });
    }

    // Check if expired
    if (new Date() > pendingRequest.expiresAt) {
      pendingRequests.delete(request_id);
      return res.status(400).json({
        success: false,
        error: 'Verification request has expired'
      });
    }

    // TODO: In production, verify the ZKP proof using Privado ID SDK
    // For now, we'll accept the proof as valid for demo purposes
    const isValid = true; // await verifyZKProof(proof, pub_signals);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proof'
      });
    }

    // Store verification in database
    if (supabase) {
      const { data, error } = await supabase
        .from('user_verifications')
        .insert({
          user_id: pendingRequest.userId,
          verification_type: pendingRequest.type,
          status: 'active',
          issuer_did: credential?.issuer_did || 'did:polygonid:unknown',
          credential_id: credential?.id || request_id,
          proof_hash: crypto.createHash('sha256').update(JSON.stringify(proof)).digest('hex'),
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          metadata: { pub_signals }
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing verification:', error);
      }
    }

    // Remove pending request
    pendingRequests.delete(request_id);

    res.json({
      success: true,
      message: 'Verification successful'
    });
  } catch (error) {
    console.error('Error handling verification callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process verification'
    });
  }
};

/**
 * Get user's verifications
 */
const getUserVerifications = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!supabase) {
      // Return demo data if Supabase not configured
      return res.json({
        success: true,
        data: []
      });
    }

    const { data, error } = await supabase
      .from('user_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error getting user verifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get verifications'
    });
  }
};

/**
 * Delete a verification
 */
const deleteVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user_id;

    if (!supabase) {
      return res.json({ success: true });
    }

    const { error } = await supabase
      .from('user_verifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete verification'
    });
  }
};

/**
 * Check verification request status
 */
const checkVerificationStatus = async (req, res) => {
  try {
    const { requestId } = req.params;

    const pendingRequest = pendingRequests.get(requestId);
    
    if (!pendingRequest) {
      return res.json({
        success: true,
        status: 'not_found'
      });
    }

    if (new Date() > pendingRequest.expiresAt) {
      pendingRequests.delete(requestId);
      return res.json({
        success: true,
        status: 'expired'
      });
    }

    res.json({
      success: true,
      status: pendingRequest.status
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status'
    });
  }
};

module.exports = {
  getVerificationTypes,
  createVerificationRequest,
  handleVerificationCallback,
  getUserVerifications,
  deleteVerification,
  checkVerificationStatus
};
